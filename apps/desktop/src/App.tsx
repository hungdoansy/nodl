import { Panel, Group, Separator } from 'react-resizable-panels'
import { Header } from './components/Header/Header'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorPane } from './components/Editor/EditorPane'
import { OutputPane } from './components/Output/OutputPane'
import { usePersistence } from './hooks/usePersistence'
import { useTheme } from './hooks/useTheme'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMenuEvents } from './hooks/useMenuEvents'
import { useOutputListener } from './hooks/useOutputListener'

export default function App() {
  usePersistence()
  useTheme()
  useKeyboardShortcuts()
  useMenuEvents()
  useOutputListener()

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-void)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Group orientation="horizontal" className="flex-1">
          <Panel defaultSize={50} minSize={20}>
            <EditorPane />
          </Panel>
          <Separator />
          <Panel defaultSize={50} minSize={20}>
            <OutputPane />
          </Panel>
        </Group>
      </div>
    </div>
  )
}
