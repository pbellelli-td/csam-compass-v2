import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import AccountList from './pages/AccountList.jsx';
import AccountDetail from './pages/AccountDetail.jsx';
import Ritual from './pages/Ritual.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<AccountList />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/ritual" element={<Ritual />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
