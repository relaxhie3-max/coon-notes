import { useState, useEffect } from 'react'
import PinScreen from './screens/PinScreen'
import HomeScreen from './screens/HomeScreen'
import AddPropertyScreen from './screens/AddPropertyScreen'
import PropertyScreen from './screens/PropertyScreen'
import RecordScreen from './screens/RecordScreen'
import ResultsScreen from './screens/ResultsScreen'

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [screen, setScreen] = useState('home')
  const [params, setParams] = useState({})

  useEffect(() => {
    if (sessionStorage.getItem('fn_authed') === 'true') setAuthed(true)
  }, [])

  const navigate = (to, p = {}) => {
    setScreen(to)
    setParams(p)
  }

  if (!authed) {
    return (
      <PinScreen
        onAuth={() => {
          sessionStorage.setItem('fn_authed', 'true')
          setAuthed(true)
        }}
      />
    )
  }

  switch (screen) {
    case 'home':
      return <HomeScreen navigate={navigate} />
    case 'addProperty':
      return <AddPropertyScreen navigate={navigate} />
    case 'property':
      return <PropertyScreen navigate={navigate} property={params.property} />
    case 'record':
      return <RecordScreen navigate={navigate} property={params.property} />
    case 'results':
      return (
        <ResultsScreen
          navigate={navigate}
          property={params.property}
          transcript={params.transcript}
          notes={params.notes}
        />
      )
    default:
      return <HomeScreen navigate={navigate} />
  }
}
