const BASE_URL = 'http://localhost:3000';

// export — 让这个function能被别的文件import进去用。你之前写的组件都用export default XXX，
// 这次不太一样，用的是export（没有default），这叫具名导出（named export）。
// 在别地方引入时要用大括号，且名字要对应 import { apiFetch } from './api'，而不是import apiFetch from './api'。
/*
// 预设导出 (你之前组件用的)
export default function App() {...}
// 引入时不用大括号，名字随便你取
import App from './App';
*/

// api.js以后可能会有不只一个要导出的东西（比如之后可能还会加别的辅助function），
// 具名导出可以让你一个文件导出多个东西，export default一个文件只能有一个
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  // localStorage是浏览器提供的储存空间，专门用来存"就算关掉分页、重开浏览器，
  // 资料还是要在"的东西——非常适合存token。getItem('token')是"读取"名字叫token的资料，如果没存过，会回传null

  const headers = {
    ...options.headers, // 展开成 'Content-Type': 'application/json'
    ...(token ? { Authorization: `Bearer ${token}` } : {}), // 再加这一个
  };
  // // 结果：
// headers = { 'Content-Type': 'application/json', Authorization: 'Bearer xxx' }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  return res; // 原始的Response物件，在后面要先解析
} 