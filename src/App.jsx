import PnrStatus from "./components/Pnrstatus.jsx";
import { Analytics } from "@vercel/analytics/next"
function App() {
  return (
    <>
      <PnrStatus />
      <Analytics />
    </>
  );
}

export default App;