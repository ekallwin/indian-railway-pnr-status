import PnrStatus from "./components/Pnrstatus.jsx";
import { Analytics } from "@vercel/analytics/react"
function App() {
  return (
    <>
      <PnrStatus />
      <Analytics />
    </>
  );
}

export default App;