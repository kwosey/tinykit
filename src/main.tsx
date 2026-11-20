import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App as TinyScenes } from './scenes/App'
import { FormLab } from './forms/App'
import './style.css'

function TinyKit() {
  const [scenes, setScenes] = useState(() => location.hash === '#tiny-scenes')
  useEffect(() => {
    function navigate() { setScenes(location.hash === '#tiny-scenes') }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    document.title = (scenes ? 'Tiny Scenes' : 'Form Lab') + ' · Tiny Kit'
  }, [scenes])

  return <>
    <nav className="kit-nav" aria-label="Tiny Kit experiments">
      <strong>Tiny Kit</strong>
      <a href="#form-lab" aria-current={scenes ? undefined : 'page'}>Form Lab</a>
      <a href="#tiny-scenes" aria-current={scenes ? 'page' : undefined}>Tiny Scenes</a>
    </nav>
    {scenes ? <TinyScenes /> : <FormLab />}
  </>
}

createRoot(document.getElementById('root')!).render(<TinyKit />)
