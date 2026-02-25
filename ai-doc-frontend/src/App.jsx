import FileUpload from "./components/FileUpload";
import ChatWindow from "./components/ChatWindow";

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-900 border-r border-gray-800 p-6">
        <h1 className="text-2xl font-bold mb-6 text-blue-400">
          AI Doc Assistant
        </h1>

        <FileUpload />
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col">
        <ChatWindow />
      </div>
    </div>
  );
}

export default App;
