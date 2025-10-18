// src/AgentGames/Institution/InstitutionLeagueSubmissions.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { checkTokenExpiry } from "../../slices/authSlice";

function InstitutionLeagueSubmissions() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const apiUrl = useSelector((state) => state.settings.agentApiUrl);
  const accessToken = useSelector((state) => state.auth.token);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const currentUser = useSelector((state) => state.auth.currentUser);

  const [submissions, setSubmissions] = useState({}); // { teamName: code }
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Derive a stable ordered list of teams (alphabetical)
  const teamList = useMemo(() => {
    return Object.keys(submissions).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  // Guard: require institution role
  useEffect(() => {
    const tokenExpired = dispatch(checkTokenExpiry());
    if (!isAuthenticated || tokenExpired || currentUser.role !== "institution") {
      navigate("/Institution");
    }
  }, [dispatch, isAuthenticated, currentUser, navigate]);

  // Fetch submissions for league
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!leagueId || !accessToken) return;
      try {
        setLoading(true);
        setError("");
        const resp = await fetch(`${apiUrl}/user/get-league-submissions/${leagueId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await resp.json();
        if (data.status === "success") {
          const map = data.data || {};
          setSubmissions(map);
          const firstTeam = Object.keys(map)[0] || "";
          setSelectedTeam(firstTeam);
        } else if (data.detail === "Invalid token") {
          navigate("/Institution");
        } else {
          setError(data.message || "Failed to load submissions");
        }
      } catch (e) {
        setError("Error fetching submissions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [apiUrl, accessToken, leagueId, navigate]);

  const selectedCode = submissions[selectedTeam] || "";

  return (
    <div className="min-h-screen bg-ui-lighter">
      <div className="max-w-[1800px] mx-auto px-6 pt-20 pb-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ui-dark">League Submissions</h1>
          <div className="flex items-center gap-2 text-ui">
            <span className="text-sm">League ID:</span>
            <span className="text-sm font-mono px-2 py-1 bg-white rounded border border-ui-light">
              {leagueId}
            </span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-6 bg-white rounded-lg shadow">Loading submissions…</div>
        ) : error ? (
          <div className="p-6 bg-white rounded-lg shadow text-danger">{error}</div>
        ) : teamList.length === 0 ? (
          <div className="p-6 bg-white rounded-lg shadow">No submissions found for this league.</div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 h-[80vh]">
            {/* Left: Monaco Editor */}
            <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
              <div className="h-full">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={selectedCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>

            {/* Right: Team list */}
            <div className="w-full lg:w-1/2 bg-white rounded-lg shadow p-4 overflow-y-auto">
              <h2 className="text-lg font-semibold text-ui-dark mb-3">Teams</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teamList.map((team) => (
                  <button
                    key={team}
                    onClick={() => setSelectedTeam(team)}
                    className={`text-left px-3 py-2 rounded border transition-colors text-sm ${
                      team === selectedTeam
                        ? "bg-primary text-white border-primary"
                        : "bg-ui-lighter text-ui-dark border-ui-light hover:bg-ui-light"
                    }`}
                    title="View latest submission"
                  >
                    <div className="font-medium truncate">{team}</div>
                    <div className="text-xs opacity-75">
                      {submissions[team]?.length ? `${submissions[team].length} chars` : "No code"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstitutionLeagueSubmissions;
