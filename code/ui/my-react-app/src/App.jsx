import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import azureDragon from './assets/AzureDragon.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://azure.com" target="_blank">
          <img src={azureDragon} className="logo" alt="Azure dragon" />
        </a>
      </div>
      <h3>The Azure dragon welcomes you to the Cloud!</h3>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <p className="read-the-docs">
        Click the dragon to go to Azure.com
      </p>
    </>
  )
}

export default App
