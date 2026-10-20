"use client";

import React, { useState, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

interface StageConfig {
  number: number;
  name: string;
  purpose: string;
  prospectLikelySays: string[];
  quickOutcomes: string[];
}

const STAGES: StageConfig[] = [
  {
    number: 1,
    name: "Pattern Interrupt & Opener",
    purpose: "Disrupt auto-pilot, acknowledge the interruption, and earn the initial 30 seconds.",
    prospectLikelySays: [
      "Who is this?",
      "I'm in a meeting right now.",
      "How did you get my number?",
      "Is this a sales call?"
    ],
    quickOutcomes: ["Hooked / Permission Given", "Rushed / Busy", "Hostile / Immediate Pushback"]
  },
  {
    number: 2,
    name: "Reason for Call",
    purpose: "Provide clear context on why you reached out to them specifically.",
    prospectLikelySays: [
      "We already have a solution for this.",
      "Just send me an email with details.",
      "What exactly do you do?"
    ],
    quickOutcomes: ["Understood & Engaged", "Requested Email", "Stalled"]
  },
  {
    number: 3,
    name: "Pain Point Discovery",
    purpose: "Surface current friction or inefficiency in their current workflow.",
    prospectLikelySays: [
      "Everything works fine right now.",
      "That is handled by a different department.",
      "We tried that before and it didn't work."
    ],
    quickOutcomes: ["Pain Identified", "Pain Denied", "Re-directed to Peer"]
  },
  {
    number: 4,
    name: "Value Proposition",
    purpose: "Directly anchor how your product eliminates that specific friction.",
    prospectLikelySays: [
      "How are you different from existing tools?",
      "Sounds expensive.",
      "We don't have budget this quarter."
    ],
    quickOutcomes: ["Value Resonated", "Skeptical of Claims", "Budget Hesitation"]
  },
  {
    number: 5,
    name: "Objection Handling",
    purpose: "Neutralize core doubts without being argumentative or defensive.",
    prospectLikelySays: [
      "Reach back out in Q3 or Q4.",
      "I'm not the right decision maker.",
      "Send a case study first."
    ],
    quickOutcomes: ["Objection Overcome", "Soft Deferred", "Hard Blocker"]
  },
  {
    number: 6,
    name: "Qualification Check",
    purpose: "Confirm authority, team scale, and timeline relevance.",
    prospectLikelySays: [
      "My director handles vendor sign-offs.",
      "Our contract is up in November.",
      "We have 15 reps on this team."
    ],
    quickOutcomes: ["Fully Qualified", "Partially Qualified", "Not a Fit"]
  },
  {
    number: 7,
    name: "The Ask (Close)",
    purpose: "Secure a firm calendar slot for a short demonstration.",
    prospectLikelySays: [
      "Send me an invite for Tuesday morning.",
      "Let me review my calendar and email you.",
      "No thanks, not interested."
    ],
    quickOutcomes: ["Meeting Booked", "Tentative / Follow-up", "Hard Rejection"]
  },
  {
    number: 8,
    name: "Wrap-up & Confirmation",
    purpose: "Confirm contact email, calendar invite receipt, and agreed prep notes.",
    prospectLikelySays: [
      "Got the invite, see you Tuesday.",
      "Send it to my work inbox.",
      "Looking forward to it."
    ],
    quickOutcomes: ["Invite Confirmed", "Sent Details Offline"]
  }
];

export default function CallerScreen() {
  const [activeTab, setActiveTab] = useState<"caller" | "history">("caller");

  // Call session state
  const [callId, setCallId] = useState<string | null>(null);
  const [prospectName, setProspectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [verbatimWords, setVerbatimWords] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finalRecap, setFinalRecap] = useState<string | null>(null);

  // History state
  const [pastCalls, setPastCalls] = useState<any[]>([]);

  const currentStage = STAGES[currentStageIdx];

  const startNewCall = async () => {
    if (!prospectName.trim()) {
      alert("Please enter a Prospect Name");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/calls/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_name: prospectName,
          company_name: companyName || "Independent"
        })
      });
      const data = await res.json();
      setCallId(data.id);
      setCurrentStageIdx(0);
      setSelectedOutcome("");
      setVerbatimWords("");
      setFinalRecap(null);
    } catch (err) {
      alert("Error starting call. Ensure your backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const advanceStage = async () => {
    if (!callId) return;
    if (!selectedOutcome) {
      alert("Please tap what happened at this stage.");
      return;
    }

    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/calls/${callId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_number: currentStage.number,
          stage_name: currentStage.name,
          stage_outcome: selectedOutcome,
          prospect_verbatim: verbatimWords
        })
      });

      if (currentStageIdx < STAGES.length - 1) {
        setCurrentStageIdx((prev) => prev + 1);
        setSelectedOutcome("");
        setVerbatimWords("");
      } else {
        handleEndCall("Completed All 8 Stages");
      }
    } catch (err) {
      alert("Failed to save stage");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async (outcomeLabel: string) => {
    if (!callId) return;
    setIsFinishing(true);
    try {
      if (selectedOutcome && currentStage) {
        await fetch(`${BACKEND_URL}/calls/${callId}/stage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage_number: currentStage.number,
            stage_name: currentStage.name,
            stage_outcome: selectedOutcome,
            prospect_verbatim: verbatimWords
          })
        });
      }

      const res = await fetch(`${BACKEND_URL}/calls/${callId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ final_outcome: outcomeLabel })
      });
      const data = await res.json();
      setFinalRecap(data.ai_summary || "Call ended.");
    } catch (err) {
      alert("Failed to end call");
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  };

  const loadPastCalls = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/calls`);
      const data = await res.json();
      setPastCalls(data);
    } catch (err) {
      console.error("Failed to fetch past calls", err);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadPastCalls();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight">Cold Call Live Copilot</h1>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 space-x-1">
          <button
            onClick={() => setActiveTab("caller")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === "caller" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Live Caller Screen
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === "history" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Past Calls Log
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
        {activeTab === "caller" ? (
          <div>
            {!callId || finalRecap ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-xl mx-auto shadow-2xl mt-8">
                {finalRecap ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-lg">
                      <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                        Call Completed & Summarized by Gemini
                      </span>
                      <p className="mt-2 text-slate-200 text-sm leading-relaxed">{finalRecap}</p>
                    </div>
                    <button
                      onClick={() => {
                        setCallId(null);
                        setFinalRecap(null);
                        setProspectName("");
                        setCompanyName("");
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-semibold transition shadow-lg"
                    >
                      Start Another Call
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-slate-100">Ready to Dial?</h2>
                    <p className="text-sm text-slate-400">
                      Enter the prospect details. Your live guide keeps you structured across all 8 call stages.
                    </p>
                    <div>
                      <label className="block text-xs uppercase font-medium text-slate-400 mb-1">
                        Prospect Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah Jenkins"
                        value={prospectName}
                        onChange={(e) => setProspectName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase font-medium text-slate-400 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Logistics"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={startNewCall}
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition"
                    >
                      {loading ? "Starting..." : "Begin Live Call"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Left Column: 8 Stages Track */}
                <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Call Trajectory
                  </div>
                  {STAGES.map((s, idx) => {
                    const isDone = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    return (
                      <div
                        key={s.number}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          isCurrent
                            ? "border-indigo-500 bg-indigo-950/40 text-white font-semibold"
                            : isDone
                            ? "border-slate-800 bg-slate-950/50 text-slate-500 line-through"
                            : "border-transparent text-slate-600"
                        }`}
                      >
                        <span>
                          {s.number}. {s.name}
                        </span>
                        {isCurrent && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />}
                      </div>
                    );
                  })}
                </div>

                {/* Center / Right: Live Stage Active Canvas */}
                <div className="md:col-span-3 space-y-6">
                  {/* Current Stage Purpose Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Stage {currentStage.number} of 8
                      </span>
                      <span className="text-sm text-slate-400">
                        Prospect: <strong className="text-white">{prospectName}</strong> ({companyName})
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{currentStage.name}</h2>
                    <p className="text-slate-300 text-sm">{currentStage.purpose}</p>

                    {/* Anticipation Area */}
                    <div className="mt-5 p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-xs font-medium text-amber-400 uppercase tracking-wider block mb-2">
                        What prospects tend to say here (Expect this):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {currentStage.prospectLikelySays.map((phrase, i) => (
                          <span
                            key={i}
                            className="bg-slate-900 text-slate-300 border border-slate-700 text-xs px-3 py-1.5 rounded-full"
                          >
                            &ldquo;{phrase}&rdquo;
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Single-Tap Outcome Buttons */}
                    <div className="mt-6">
                      <label className="block text-xs uppercase font-medium text-slate-400 mb-2">
                        Single-Tap What Happened at this Stage:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {currentStage.quickOutcomes.map((outcome) => (
                          <button
                            key={outcome}
                            onClick={() => setSelectedOutcome(outcome)}
                            className={`p-3 text-xs rounded-lg border text-left font-medium transition ${
                              selectedOutcome === outcome
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-md ring-2 ring-indigo-400"
                                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            {outcome}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Verbatim Words Box */}
                    <div className="mt-6">
                      <label className="block text-xs uppercase font-medium text-slate-400 mb-1">
                        Prospect&apos;s Own Words (Verbatim Notes):
                      </label>
                      <textarea
                        rows={3}
                        value={verbatimWords}
                        onChange={(e) => setVerbatimWords(e.target.value)}
                        placeholder="Type exact phrases or objections heard..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEndCall("Meeting Booked")}
                          disabled={isFinishing}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Booked Meeting
                        </button>
                        <button
                          onClick={() => handleEndCall("Prospect Hung Up / Rejected")}
                          disabled={isFinishing}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Hung Up / Lost
                        </button>
                      </div>

                      <button
                        onClick={advanceStage}
                        disabled={loading || isFinishing}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
                      >
                        {loading
                          ? "Saving..."
                          : currentStageIdx === STAGES.length - 1
                          ? "Complete Call"
                          : "Save & Next Stage →"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* History Screen */
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-white">Call Log History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-3">Prospect</th>
                    <th className="p-3">Highest Stage</th>
                    <th className="p-3">Outcome</th>
                    <th className="p-3">Gemini CRM Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pastCalls.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500">
                        No calls recorded yet.
                      </td>
                    </tr>
                  ) : (
                    pastCalls.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-white">
                          {c.prospect_name}
                          <span className="block text-xs font-normal text-slate-400">
                            {c.company_name}
                          </span>
                        </td>
                        <td className="p-3">Stage {c.highest_stage_reached} / 8</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-xs bg-slate-800 border border-slate-700 font-medium">
                            {c.final_outcome || "In Progress"}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-300 max-w-md">
                          {c.ai_summary || "None"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}