import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GamePage } from './pages/GamePage.tsx';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
