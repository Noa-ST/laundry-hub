import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { MockUserProvider } from './context/MockUserContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MockUserProvider>
      <App />
    </MockUserProvider>
  </React.StrictMode>,
)
