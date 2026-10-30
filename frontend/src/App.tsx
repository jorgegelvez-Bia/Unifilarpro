import { useState } from 'react';
import { AddButtons } from '@/components/AddButtons';
import { ChecksPanel } from '@/components/ChecksPanel';
import { DiagramView } from '@/components/DiagramView';
import { ElementList } from '@/components/ElementList';
import { Header } from '@/components/Header';
import { MyDiagrams } from '@/components/MyDiagrams';
import { ProjectForm } from '@/components/ProjectForm';
import { Toast } from '@/components/Toast';
import { useStore } from '@/store/diagram';

export default function App() {
  const [showList, setShowList] = useState(false);
  const finish = useStore((s) => s.finish);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-3.5 px-4 pb-10 pt-3.5">
      <Header onToggleList={() => setShowList((v) => !v)} />
      {showList && <MyDiagrams onClose={() => setShowList(false)} />}
      <ProjectForm />
      {/* En celular: diagrama, lista y luego botones (igual al HTML). */}
      <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
        <div className="order-3 flex flex-col gap-3.5 lg:order-1">
          <AddButtons />
        </div>
        <div className="order-1 flex flex-col gap-3.5 lg:order-2 lg:row-span-2">
          <DiagramView />
          <ChecksPanel />
        </div>
        <div className="order-2 flex flex-col gap-3.5 lg:order-3">
          <ElementList />
          <button className="btn w-full justify-center border-[#1E7B34] bg-[#1E7B34] py-3 font-bold text-white" onClick={finish}>
            Finalizar diagrama y guardarlo
          </button>
        </div>
      </div>
      <Toast />
    </div>
  );
}
