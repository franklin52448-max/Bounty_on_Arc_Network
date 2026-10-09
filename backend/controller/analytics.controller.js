// backend/controller/analytics.controller.js
// Schemas: backend/modules/{bounty,submission,enrollment}.module.js
const Bounty = require("../modules/bounty.module");
const Submission = require("../modules/submission.module");
const Enrollment = require("../modules/enrollment.module");
const { getPublicClient } = require("../config/chains");
const { parseAbi } = require("viem");

// Minimal ABI (subset of backend/config/abi.js): claim status + claim event
const CLAIM_ABI = parseAbi([
  "function claimed(uint256 bountyId, address winner) view returns (bool)",
  "event RewardClaimed(uint256 indexed bountyId, address indexed winner, uint256 amount)",
]);

const DAY = 86400000;
const ADDR = /^0x[a-fA-F0-9]{40}$/;
const lc = (w) => String(w || "").toLowerCase();
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const hours = (ms) => Math.round((ms / 3600000) * 10) / 10;
const ciMatch = (w) => new RegExp(`^${w}$`, "i"); // w is validated hex, safe

// Mirrors the Bounty.currentStatus virtual exactly (virtuals can't run in aggregation).
// Built per request so "now" is the request time, not module load time.
const statusExpr = () => {
  const now = new Date();
  return {
    $switch: {
      branches: [
        { case: { $in: ["$lifecycleStatus", ["completed", "cancelled"]] }, then: "$lifecycleStatus" },
        { case: { $lt: [now, "$startDate"] }, then: "upcoming" },
        { case: { $lte: [now, "$deadline"] }, then: "active" },
      ],
      default: "ended",
    },
  };
};

// Per-winner payout, derived from payoutType (winners.assigned is just wallet strings)
function payouts(b) {
  const w = (b.winners?.assigned || []).map(lc);
  if (!w.length) return [];
  if (b.payoutType === "MULTI_PERCENTAGE")
    return w.map((wallet, i) => ({ wallet, amount: (b.reward * (b.percentages?.[i] || 0)) / 100 }));
  if (b.payoutType === "MULTI_EQUAL") return w.map((wallet) => ({ wallet, amount: b.reward / w.length }));
  return [{ wallet: w[0], amount: b.reward }];
}

// Claim data comes from the contract: claimed() for status, RewardClaimed logs for timing.
// Any RPC failure degrades to null (UI shows n/a) instead of a 500.
async function claimData(bounties) {
  const out = { unclaimed: null, avgHoursToClaim: null };
  const live = bounties.filter(
    (b) => b.isOnChain && b.blockchainId != null && b.bountyContract && b.distributedAt && b.winners?.assigned?.length,
  );
  if (!live.length) return { unclaimed: [], avgHoursToClaim: 0 };

  const groups = {};
  live.forEach((b) => {
    (groups[`${b.network}:${b.bountyContract}`] ||= []).push(b);
  });

  const unclaimed = [];
  const claimMs = [];
  try {
    for (const [key, list] of Object.entries(groups)) {
      const [network, address] = key.split(":");
      const client = getPublicClient(network);
      const pairs = list.flatMap((b) => payouts(b).map((p) => ({ b, ...p })));

      const calls = pairs.map((x) => ({
        address,
        abi: CLAIM_ABI,
        functionName: "claimed",
        args: [BigInt(x.b.blockchainId), x.wallet],
      }));
      let res;
      try {
        res = await client.multicall({ contracts: calls, allowFailure: true });
      } catch {
        res = await Promise.all(
          calls.map((c) =>
            client
              .readContract(c)
              .then((result) => ({ status: "success", result }))
              .catch(() => ({ status: "failure" })),
          ),
        );
      }
      pairs.forEach((x, i) => {
        if (res[i].status === "success" && !res[i].result)
          unclaimed.push({ bountyId: x.b._id, title: x.b.title, wallet: x.wallet, amount: x.amount });
      });

      // timing: claim block time minus distributedAt
      try {
        const logs = await client.getLogs({
          address,
          event: CLAIM_ABI[1],
          fromBlock: "earliest",
          toBlock: "latest",
          args: { bountyId: list.map((b) => BigInt(b.blockchainId)) },
        });
        const blocks = [...new Set(logs.map((l) => l.blockNumber))].slice(0, 50);
        const ts = {};
        await Promise.all(
          blocks.map(async (n) => {
            ts[n] = Number((await client.getBlock({ blockNumber: n })).timestamp) * 1000;
          }),
        );
        const dist = Object.fromEntries(
          list.map((b) => [String(b.blockchainId), new Date(b.distributedAt).getTime()]),
        );
        logs.forEach((l) => {
          const t = ts[l.blockNumber];
          const d = dist[String(l.args.bountyId)];
          if (t && d) claimMs.push(Math.max(0, t - d));
        });
      } catch (e) {
        console.warn("analytics claim logs unavailable", e.message);
        out.noTiming = true;
      }
    }
    return { unclaimed, avgHoursToClaim: out.noTiming ? null : hours(avg(claimMs)) };
  } catch (e) {
    console.warn("analytics claim reads unavailable", e.message);
    return out;
  }
}

const cache = new Map(); // wallet -> { t, data }; 60s TTL keeps warm loads fast

const DISTRIBUTED = { distributedAt: { $ne: null } };
const badWallet = (res) => res.status(400).json({ error: "Invalid wallet address" });

// GET /api/analytics/platform
exports.platform = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * DAY);
    const [distributed, statusCounts, categories, daily, paid] = await Promise.all([
      Bounty.aggregate([{ $match: DISTRIBUTED }, { $group: { _id: null, total: { $sum: "$reward" } } }]),
      Bounty.aggregate([{ $addFields: { s: statusExpr() } }, { $group: { _id: "$s", n: { $sum: 1 } } }]),
      Submission.aggregate([
        { $lookup: { from: Bounty.collection.name, localField: "bountyId", foreignField: "_id", as: "b" } },
        { $unwind: "$b" },
        { $group: { _id: "$b.category", submissions: { $sum: 1 } } },
        { $sort: { submissions: -1 } },
      ]),
      Submission.aggregate([
        { $match: { submittedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } }, n: { $sum: 1 } } },
      ]),
      Bounty.find({ ...DISTRIBUTED, "winners.assigned.0": { $exists: true } })
        .select("reward payoutType percentages winners.assigned")
        .lean(),
    ]);

    const earned = {};
    paid.forEach((b) =>
      payouts(b).forEach((p) => {
        earned[p.wallet] = earned[p.wallet] || { wallet: p.wallet, earned: 0, wins: 0 };
        earned[p.wallet].earned += p.amount;
        earned[p.wallet].wins += 1;
      }),
    );
    const topEarners = Object.values(earned)
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 5);

    const byDay = Object.fromEntries(daily.map((d) => [d._id, d.n]));
    const submissionsOverTime = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - (29 - i) * DAY).toISOString().slice(0, 10);
      return { date, count: byDay[date] || 0 };
    });
    const sc = Object.fromEntries(statusCounts.map((s) => [s._id, s.n]));

    res.json({
      totalDistributed: distributed[0]?.total || 0,
      activeBounties: sc.active || 0,
      completedBounties: sc.completed || 0,
      topEarners,
      categories: categories.map((c) => ({ category: c._id || "Uncategorized", submissions: c.submissions })),
      submissionsOverTime,
    });
  } catch (e) {
    console.error("analytics.platform", e);
    res.status(500).json({ error: "Failed to load platform analytics" });
  }
};

// GET /api/analytics/creator/:wallet
exports.creator = async (req, res) => {
  try {
    if (!ADDR.test(req.params.wallet)) return badWallet(res);
    const key = lc(req.params.wallet);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < 60000) return res.json(hit.data);

    const bounties = await Bounty.find({ creator: ciMatch(req.params.wallet) })
      .select(
        "title startDate distributedAt reward payoutType percentages winners.assigned network bountyContract blockchainId isOnChain",
      )
      .lean();

    const base = {
      bountyCount: bounties.length,
      funnel: { views: null, enrollments: 0, submissions: 0, winners: 0 },
      avgHoursToFirstSubmission: 0,
      avgHoursToClaim: 0,
      unclaimed: [],
    };
    if (!bounties.length) return res.json(base);

    const ids = bounties.map((b) => b._id);
    const [enr, subs] = await Promise.all([
      Enrollment.countDocuments({ bountyId: { $in: ids } }),
      Submission.aggregate([
        { $match: { bountyId: { $in: ids } } },
        { $group: { _id: "$bountyId", n: { $sum: 1 }, first: { $min: "$submittedAt" } } },
      ]),
    ]);

    const start = Object.fromEntries(bounties.map((b) => [String(b._id), b.startDate]));
    const firstMs = subs.map((s) => Math.max(0, new Date(s.first) - new Date(start[String(s._id)])));

    const claims = await claimData(bounties);
    const data = {
      ...base,
      ...claims,
      funnel: {
        views: null,
        enrollments: enr,
        submissions: subs.reduce((a, s) => a + s.n, 0),
        winners: bounties.reduce((a, b) => a + (b.winners?.assigned?.length || 0), 0),
      },
      avgHoursToFirstSubmission: hours(avg(firstMs)),
    };
    cache.set(key, { t: Date.now(), data });
    res.json(data);
  } catch (e) {
    console.error("analytics.creator", e);
    res.status(500).json({ error: "Failed to load creator analytics" });
  }
};

// GET /api/analytics/contributor/:wallet
exports.contributor = async (req, res) => {
  try {
    if (!ADDR.test(req.params.wallet)) return badWallet(res);
    const wallet = lc(req.params.wallet);
    const [subStats, won] = await Promise.all([
      Submission.aggregate([
        { $match: { user: wallet } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          },
        },
      ]),
      Bounty.find({ ...DISTRIBUTED, "winners.assigned": ciMatch(wallet) })
        .select("reward payoutType percentages winners.assigned distributedAt category")
        .lean(),
    ]);

    const total = subStats[0]?.total || 0;
    const accepted = subStats[0]?.accepted || 0;
    const trend = {};
    const cats = {};
    let totalEarned = 0;
    let wins = 0;
    won.forEach((b) => {
      const mine = payouts(b).find((p) => p.wallet === wallet);
      if (!mine) return;
      wins += 1;
      totalEarned += mine.amount;
      const day = new Date(b.distributedAt).toISOString().slice(0, 10);
      trend[day] = (trend[day] || 0) + mine.amount;
      const c = b.category || "Uncategorized";
      cats[c] = (cats[c] || 0) + 1;
    });
    let run = 0;

    res.json({
      submissions: total,
      accepted,
      acceptanceRate: total ? Math.round((accepted / total) * 1000) / 10 : 0,
      wins,
      totalEarned,
      avgRewardPerWin: wins ? totalEarned / wins : 0,
      earningsTrend: Object.keys(trend)
        .sort()
        .map((date) => ({ date, cumulative: (run += trend[date]) })),
      topCategories: Object.entries(cats)
        .map(([category, w]) => ({ category, wins: w }))
        .sort((a, b) => b.wins - a.wins),
    });
  } catch (e) {
    console.error("analytics.contributor", e);
    res.status(500).json({ error: "Failed to load contributor analytics" });
  }
};
