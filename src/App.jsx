import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { apiFetch } from './api';
import HomePage from './pages/HomePage';
import NewsPage from './pages/NewsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './App.css';

function App() {
  const [portfolio, setPortfolio] = useState(null);
  // portfolio一开始是"完全不存在"的状态（还没抓到任何东西），用null比较符合语意，之后判断"资料到了没"也更清楚
  const [loading, setLoading] = useState(true);
  /*
  useState([])
  这是React的"状态"概念——holdings是一个会被记住、且改变时画面会自动更新的变量。
  setHoldings是用来"更新"它的专用function。跟一般JS变量不同的地方是：
  用setHoldings改变它的值，React会自动重新画面，不用你自己手动操作DOM。
  */
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  // 一开始就检查"浏览器里有没有存过token"来决定初始的登入状态。**!!**是一个常见的小技巧
  // 把任何值转换成纯粹的true/false（比如字串会变true，null会变false）。

  const fetchPortfolio = () => {
  setLoading(true);
  apiFetch('/portfolio/summary')
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        // token有问题，强制登出，让使用者重新登入
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      setPortfolio(data);
      setLoading(false);
    });
};
  // 里面我们呼叫你的 backend API（fetch('http://localhost:3000/holdings')），
  // 拿到资料后用setHoldings(data)存起来。

  useEffect(() => {
    if (isLoggedIn) {
      fetchPortfolio();
    }
  }, [isLoggedIn]);
  // 这是"当画面第一次显示时，执行这段code"的意思。后面那个[]（空array）代表"只在一开始执行一次"。
  // 每次isLoggedIn这个值改变时，就重新执行一次。
  // 具体会发生几次，取决于使用者的操作：
  // 第一次渲染时：一定会执行一次（不管isLoggedIn是true还是false，因为组件刚出现，"值从无到有"本身就算一次触发）
  // 使用者登入成功（isLoggedIn从false变true）→ 再执行一次 → 这次因为isLoggedIn是true，会呼叫fetchPortfolio()
  // 使用者登出（isLoggedIn从true变false）→ 再执行一次 → 这次因为isLoggedIn是false，if判断不通过，不会呼叫fetchPortfolio()
   
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

   return (
    <BrowserRouter>
      {isLoggedIn && (
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            持仓总览
          </NavLink>
          <NavLink to="/news" className={({ isActive }) => (isActive ? 'active' : '')}>
            新闻分析
          </NavLink>
          <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>
            登出
          </button>
        </nav>
      )}

      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/" />
            ) : (
              <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />
            )
          }
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/" /> : <RegisterPage />}
        />
        <Route
          path="/"
          element={
            isLoggedIn ? (
              loading ? (
                <p>加载中...</p>
              ) : (
                <HomePage portfolio={portfolio} fetchPortfolio={fetchPortfolio} />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/news"
          element={isLoggedIn ? <NewsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/news/:symbol"
          element={isLoggedIn ? <NewsPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
// 资料由上而下流动（父→子），而"发生了什么事"由下而上通知（子呼叫父给的function）

/*
BrowserRouter- 包住整个app的最外层，让React知道"这个app要根据网址不同，显示不同页面"。

Routes - 一个容器，里面放好几个Route。每个Route定义"当网址是这个path时，显示这个element"：

path="/" → 显示HomePage
path="/news" → 显示NewsPage

*/