import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Web3Provider } from "./context/Web3Context";
import Layout from "./components/Layout";
import Marketplace from "./components/Marketplace";
import MintPage from './components/Mint'; // ✅ Matches Mint.jsx
import CollectionPage from './components/CollectionsPage';
import NotFound from "./components/NotFound";

function App() {
  return (
    <Web3Provider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/mint" element={<MintPage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </Router>
    </Web3Provider>
  );
}

export default App;