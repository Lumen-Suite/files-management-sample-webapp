import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Browse from './pages/Browse.jsx'
import ArchivedFiles from './pages/ArchivedFiles.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Browse />} />
        <Route path="/archive" element={<ArchivedFiles />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
