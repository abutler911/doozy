import { useEffect, useMemo, useState } from "react";
import { api, auth } from "./lib/api.js";
import Login from "./components/Login.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import TaskItem from "./components/TaskItem.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import InstallButton from "./components/InstallButton.jsx";

const PRIORITY_CYCLE = { 1: 2, 2: 3, 3: 4, 4: 1 };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function App() {
  const [authed, setAuthed] = useState(!!auth.token);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listTasks();
      setTasks(data);
      setAuthed(true);
      setNeedsLogin(false);
    } catch (err) {
      if (err.message === "Unauthorized") setNeedsLogin(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { dailyTasks, openTasks, doneTasks } = useMemo(() => {
    const daily = tasks.filter((t) => t.type === "daily");
    const oneoffs = tasks.filter((t) => t.type === "oneoff");
    return {
      dailyTasks: daily,
      openTasks: oneoffs.filter((t) => !t.completed),
      doneTasks: oneoffs.filter((t) => t.completed),
    };
  }, [tasks]);

  const dailyProgress = useMemo(() => {
    if (!dailyTasks.length) return null;
    const done = dailyTasks.filter((t) => t.doneToday).length;
    return { done, total: dailyTasks.length };
  }, [dailyTasks]);

  async function createTask(task) {
    const created = await api.createTask(task);
    setTasks((t) => [created, ...t]);
  }

  async function toggle(task) {
    const updated = await api.toggleTask(task._id);
    setTasks((t) => t.map((x) => (x._id === task._id ? updated : x)));
  }

  async function remove(task) {
    await api.deleteTask(task._id);
    setTasks((t) => t.filter((x) => x._id !== task._id));
  }

  async function cyclePriority(task) {
    const priority = PRIORITY_CYCLE[task.priority] || 2;
    const updated = await api.updateTask(task._id, { priority });
    setTasks((t) =>
      t
        .map((x) => (x._id === task._id ? updated : x))
        .sort((a, b) => b.priority - a.priority || a.order - b.order)
    );
  }

  if (needsLogin && !authed) {
    return <Login onSuccess={load} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>✦</span>
          <span className="brand-name">doozy</span>
        </div>
        <div className="topbar-actions">
          <InstallButton />
          <button
            className="icon-btn settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="container">
        <div className="hero">
          <h1>{greeting()}, Andrew.</h1>
          <p className="hero-sub">
            {openTasks.length === 0 && (!dailyProgress || dailyProgress.done === dailyProgress.total)
              ? "You're all caught up. Nice. ✨"
              : `${openTasks.length} task${openTasks.length === 1 ? "" : "s"} to tackle today.`}
          </p>
        </div>

        <TaskComposer onCreate={createTask} />

        {loading ? (
          <div className="empty">Loading…</div>
        ) : (
          <>
            {dailyTasks.length > 0 && (
              <section className="section">
                <div className="section-head">
                  <h2>Daily rituals</h2>
                  {dailyProgress && (
                    <span className="progress-pill">
                      {dailyProgress.done}/{dailyProgress.total}
                    </span>
                  )}
                </div>
                <ul className="task-list">
                  {dailyTasks.map((t) => (
                    <TaskItem
                      key={t._id}
                      task={t}
                      onToggle={toggle}
                      onDelete={remove}
                      onCyclePriority={cyclePriority}
                    />
                  ))}
                </ul>
              </section>
            )}

            <section className="section">
              <div className="section-head">
                <h2>Today</h2>
              </div>
              {openTasks.length === 0 ? (
                <div className="empty">Nothing here yet — add a task above.</div>
              ) : (
                <ul className="task-list">
                  {openTasks.map((t) => (
                    <TaskItem
                      key={t._id}
                      task={t}
                      onToggle={toggle}
                      onDelete={remove}
                      onCyclePriority={cyclePriority}
                    />
                  ))}
                </ul>
              )}
            </section>

            {doneTasks.length > 0 && (
              <section className="section section-done">
                <div className="section-head">
                  <h2>Done</h2>
                  <span className="progress-pill">{doneTasks.length}</span>
                </div>
                <ul className="task-list">
                  {doneTasks.map((t) => (
                    <TaskItem
                      key={t._id}
                      task={t}
                      onToggle={toggle}
                      onDelete={remove}
                      onCyclePriority={cyclePriority}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
