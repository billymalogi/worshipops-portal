// In ResizableRow.tsx

// Add props here
export default function ResizableRow({ title, notes }) { 
  return (
    <div className="w-full border-b border-gray-200 py-2">
      <PanelGroup direction="horizontal" autoSaveId="schedule-layout">
        
        {/* Left Panel */}
        <Panel defaultSize={40} minSize={20} className="flex items-center pr-2">
          <div className="flex items-center gap-3 w-full pl-2"> {/* Added pl-2 for spacing */}
            <button className="cursor-grab text-gray-400">
               {/* Your Icon Component */}
               <GripVertical size={16} /> 
            </button>
            
            {/* USE THE PROP HERE */}
            <div className="font-medium text-gray-900 truncate">
              {title} 
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="..." /> {/* Keep your handle styles */}

        {/* Right Panel */}
        <Panel defaultSize={60} minSize={20} className="flex items-center pl-2">
           {/* USE THE PROP HERE (optional, or keep empty input) */}
          <input 
            type="text" 
            defaultValue={notes}
            placeholder="Add notes..." 
            className="w-full bg-transparent border-none focus:ring-0"
          />
        </Panel>

      </PanelGroup>
    </div>
  );
}