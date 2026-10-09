import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi"; 

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Create from "./pages/Create";
import BountyDetail from "./pages/BountyDetail";
import Admin from "./pages/Admin";
import FAQPage from "./pages/Faqs";
import WhitepaperPage from "./pages/WhitePaper";
import ContactUs from "./pages/ContactUs";
import Docs from "./pages/Docs";
import Analytics from "./pages/Analytics";

import LoadingScreen from "./components/LoadingScreen";
import { useTheme } from "./context/ThemeContext";

function App() {
  const [loading, setLoading] = useState(true);
  const { dark, setDark } = useTheme();

  const RequireWallet = ({ children }) => {
    const { address, isConnected } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
      if (!address && !isConnected) {
        navigate("/", { replace: true });
      }
    }, [address, isConnected, navigate]);

    if (!address && !isConnected) return null;

    return children;
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}

      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<LandingPage dark={dark} setDark={setDark} />}
          />

          <Route
            path="/faqs"
            element={<FAQPage dark={dark} setDark={setDark} />}
          />

          <Route
            path="/whitepaper"
            element={<WhitepaperPage dark={dark} setDark={setDark} />}
          />

          <Route
            path="/contact"
            element={<ContactUs dark={dark} setDark={setDark} />}
          />

          <Route
            path="/docs"
            element={
              <Docs
                dark={dark}
                setDark={setDark}
              />
            }
          />

          <Route
            path="/analytics"
            element={<Analytics dark={dark} setDark={setDark} />}
          />

          <Route
            path="/dashboard"
            element={
              <RequireWallet>
                <Dashboard dark={dark} setDark={setDark} />
              </RequireWallet>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireWallet>
                <Profile dark={dark} setDark={setDark} />
              </RequireWallet>
            }
          />

          <Route
            path="/create"
            element={
              <RequireWallet>
                <Create dark={dark} setDark={setDark} />
              </RequireWallet>
            }
          />

          <Route
            path="/bounty/:id"
            element={
              <RequireWallet>
                <BountyDetail dark={dark} setDark={setDark} />
              </RequireWallet>
            }
          />

          <Route
            path="/admin-224466"
            element={
              <RequireWallet>
                <Admin dark={dark} setDark={setDark} />
              </RequireWallet>
            }
          />

          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
