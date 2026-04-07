import { Panel, Group, Separator } from 'react-resizable-panels'
import { Header } from './components/Header/Header'
import { EditorPane } from './components/Editor/EditorPane'
import { OutputPane } from './components/Output/OutputPane'

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <Group direction="horizontal" className="flex-1">
        <Panel defaultSize={50} minSize={20}>
          <EditorPane />
        </Panel>
        <Separator className="w-1 bg-zinc-700 hover:bg-zinc-500 transition-colors cursor-col-resize" />
        <Panel defaultSize={50} minSize={20}>
          <OutputPane />
        </Panel>
      </Group>
    </div>
  )
}
