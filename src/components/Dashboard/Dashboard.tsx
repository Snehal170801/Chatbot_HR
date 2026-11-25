// src/components/Dashboard/Dashboard.tsx

import { InterviewProvider } from "../../context/InterviewContext";
import Panel from "./Panel";
import ChatPanel from "./ChatPanel";
import AvatarPanel from "./AvatarPanel";
import Header from "./Header";
import EvaluationReport from "./EvaluationReport"; // ← NEW

const Dashboard = () => {
  return (
    <InterviewProvider>
      <div className="dash-fit relative flex min-h-full w-full flex-col items-start gap-4 px-4 pb-6 pt-0 xl:block xl:h-full xl:px-0 xl:pb-0 xl:pt-0">
        <Panel />
        <Header />
        <ChatPanel />
        <AvatarPanel />
        {/* AddAndEvaluateButton lives inside Panel — do NOT render it here */}
        {/* Evaluation report modal — self-contained, reads from context */}
        <EvaluationReport /> {/* ← NEW */}
      </div>
    </InterviewProvider>
  );
};

export default Dashboard;
