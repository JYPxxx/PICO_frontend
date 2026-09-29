import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 프로토타입(dist/) 스타일을 수정 없이 같은 순서로 불러온다. 디자인 변경은 이 파일들에서 한다.
import './styles/styles.css'
import './styles/account.css'
import './styles/transactions.css'
import './styles/desktop.css'
import './styles/pc-refinements.css'
import './styles/react.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
