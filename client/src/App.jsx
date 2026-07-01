import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { api, auth } from "./lib/api.js";
import { dueInfo } from "./lib/dates.js";
import { useToast } from "./components/Toast.jsx";
import Login from "./components/Login.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import TaskItem from "./components/TaskItem.jsx";
import SortableTaskItem from "./components/SortableTaskItem.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import TaskEditor from "./components/TaskEditor.jsx";
import NotesView from "./components/NotesView.jsx";
import InstallButton from "./components/InstallButton.jsx";
import Footer from "./components/Footer.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

const PRIORITY_CYCLE = { 1: 2, 2: 3, 3: 4, 4: 1 };
const SORT_KEY = "doozy_sort_mode";
const DAILY_KEY = "doozy_daily_open";
const VIEW_KEY = "doozy_view";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function byPriority(a, b) {
  return b.priority - a.priority || a.order - b.order;
}
function byOrder(a, b) {
  return a.order - b.order;
}

export default function App() {
  const toast = useToast();
  const [authed, setAuthed] = useState(!!auth.token);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sortMode, setSortMode] = useState(
    () => localStorage.getItem(SORT_KEY) || "priority"
  );
  const [dailyOpen, setDailyOpen] = useState(
    () => localStorage.getItem(DAILY_KEY) !== "false"
  );
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState(
    () => localStorage.getItem(VIEW_KEY) || "tasks"
  );

  // Pending-delete timers, keyed by task id, so Undo can cancel them.
  const deleteTimers = useRef({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function load() {
    setLoading(true);
    try {
      const data = await api.listTasks();
      setTasks(data);
      setAuthed(true);
      setNeedsLogin(false);
    } catch (err) {
      if (err.message === "Unauthorized") setNeedsLogin(true);
      else toast.error("Couldn't load your tasks. Check the server is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSort(mode) {
    setSortMode(mode);
    localStorage.setItem(SORT_KEY, mode);
  }

  function toggleDaily() {
    setDailyOpen((open) => {
      localStorage.setItem(DAILY_KEY, String(!open));
      return !open;
    });
  }

  function toggleSearch() {
    setShowSearch((s) => {
      if (s) setQuery("");
      return !s;
    });
  }

  function switchView(next) {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
    // The search box is shared; clear it so a stale query doesn't carry over.
    setQuery("");
    setShowSearch(false);
  }

  async function clearCompleted() {
    const removed = doneTasks;
    setTasks((t) => t.filter((x) => !(x.type === "oneoff" && x.completed)));
    try {
      await api.clearCompleted();
      toast.success(`Cleared ${removed.length} completed task${removed.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error("Couldn't clear completed tasks.");
      setTasks((t) => [...removed, ...t]); // restore on failure
    }
  }

  const sorter = sortMode === "manual" ? byOrder : byPriority;

  const { dailyTasks, openTasks, doneTasks } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (t) => !q || t.title.toLowerCase().includes(q);
    // Daily rituals: only those scheduled for today, matching the search.
    const daily = tasks
      .filter((t) => t.type === "daily" && t.scheduledToday !== false && matches(t))
      .slice()
      .sort(byPriority);
    const oneoffs = tasks.filter((t) => t.type === "oneoff" && matches(t));
    return {
      dailyTasks: daily,
      openTasks: oneoffs.filter((t) => !t.completed).slice().sort(sorter),
      doneTasks: oneoffs.filter((t) => t.completed).slice().sort(byPriority),
    };
  }, [tasks, sorter, query]);

  const dailyProgress = useMemo(() => {
    if (!dailyTasks.length) return null;
    const done = dailyTasks.filter((t) => t.doneToday).length;
    return { done, total: dailyTasks.length };
  }, [dailyTasks]);

  async function createTask(task) {
    try {
      const created = await api.createTask(task);
      setTasks((t) => [created, ...t]);
    } catch (err) {
      toast.error("Couldn't add that task.");
    }
  }

  async function toggle(task) {
    try {
      const updated = await api.toggleTask(task._id);
      setTasks((t) => t.map((x) => (x._id === task._id ? updated : x)));
      // A recurring to-do rolls forward instead of finishing — let the user know.
      if (task.type === "oneoff" && task.recurrence && !updated.completed) {
        const info = dueInfo(updated.dueDate, false);
        toast.success(info ? `Done — next due ${info.label}.` : "Done — rolled forward.");
      }
    } catch (err) {
      toast.error("Couldn't update that task.");
    }
  }

  function remove(task) {
    // Optimistically remove, then actually delete after the undo window.
    setTasks((t) => t.filter((x) => x._id !== task._id));
    deleteTimers.current[task._id] = setTimeout(async () => {
      delete deleteTimers.current[task._id];
      try {
        await api.deleteTask(task._id);
      } catch (err) {
        toast.error("Couldn't delete that task.");
        setTasks((t) => [task, ...t]); // restore on failure
      }
    }, 5000);

    toast.show({
      message: `Deleted “${task.title}”`,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(deleteTimers.current[task._id]);
          delete deleteTimers.current[task._id];
          setTasks((t) => [task, ...t]);
        },
      },
    });
  }

  async function addSubtask(task, title) {
    try {
      const updated = await api.addSubtask(task._id, title);
      setTasks((t) => t.map((x) => (x._id === task._id ? updated : x)));
    } catch (err) {
      toast.error("Couldn't add that item.");
    }
  }

  async function toggleSubtask(task, subId) {
    try {
      const updated = await api.toggleSubtask(task._id, subId);
      setTasks((t) => t.map((x) => (x._id === task._id ? updated : x)));
    } catch (err) {
      toast.error("Couldn't update that item.");
    }
  }

  async function deleteSubtask(task, subId) {
    try {
      const updated = await api.deleteSubtask(task._id, subId);
      setTasks((t) => t.map((x) => (x._id === task._id ? updated : x)));
    } catch (err) {
      toast.error("Couldn't remove that item.");
    }
  }

  async function cyclePriority(task) {
    const priority = PRIORITY_CYCLE[task.priority] || 2;
    try {
      const updated = await api.updateTask(task._id, { priority });
      setTasks((t) => t.map((x) => (x._id === task._id ? updated : x)));
    } catch (err) {
      toast.error("Couldn't change priority.");
    }
  }

  async function saveEdit(updates) {
    const id = editing._id;
    try {
      const updated = await api.updateTask(id, updates);
      setTasks((t) => t.map((x) => (x._id === id ? updated : x)));
      setEditing(null);
      toast.success("Saved.");
    } catch (err) {
      toast.error("Couldn't save changes.");
    }
  }

  async function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = openTasks.map((t) => t._id);
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    const newIds = arrayMove(ids, from, to);

    // Reflect new order locally (order = index within the open list).
    setTasks((t) =>
      t.map((x) => {
        const i = newIds.indexOf(x._id);
        return i >= 0 ? { ...x, order: i } : x;
      })
    );
    try {
      await api.reorderTasks(newIds);
    } catch (err) {
      toast.error("Couldn't save the new order.");
    }
  }

  if (needsLogin && !authed) {
    return <Login onSuccess={load} />;
  }

  const itemHandlers = {
    onToggle: toggle,
    onAddSubtask: addSubtask,
    onToggleSubtask: toggleSubtask,
    onDeleteSubtask: deleteSubtask,
    onDelete: remove,
    onCyclePriority: cyclePriority,
    onEdit: setEditing,
  };

  const wide = view === "notes";

  return (
    <div className="app">
      <header className={`topbar ${wide ? "topbar-wide" : ""}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden>✦</span>
          <span className="brand-name">doozy</span>
        </div>
        <div className="topbar-actions">
          <InstallButton />
          <button
            className={`icon-btn ${showSearch ? "icon-btn-on" : ""}`}
            onClick={toggleSearch}
            aria-label="Search"
          >
            ⌕
          </button>
          <ThemeToggle />
          <button
            className="icon-btn settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className={`container ${wide ? "container-wide" : ""}`}>
        <nav className="viewnav">
          <div className="seg seg-lg">
            <button
              className={view === "tasks" ? "seg-on" : ""}
              onClick={() => switchView("tasks")}
            >
              Tasks
            </button>
            <button
              className={view === "notes" ? "seg-on" : ""}
              onClick={() => switchView("notes")}
            >
              Notes
            </button>
          </div>
        </nav>

        {showSearch && (
          <input
            className="search-input"
            type="search"
            placeholder={view === "notes" ? "Search notes…" : "Search tasks…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        )}

        {view === "notes" ? (
          <NotesView toast={toast} query={query} />
        ) : (
          <>
        <div className="hero">
          <p className="hero-date">{todayLabel()}</p>
          <h1>{greeting()}, Andrew.</h1>
          <p className="hero-sub">
            {openTasks.length === 0 &&
            (!dailyProgress || dailyProgress.done === dailyProgress.total)
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
                <button
                  className="section-head section-toggle"
                  onClick={toggleDaily}
                  aria-expanded={dailyOpen}
                >
                  <span className={`chevron ${dailyOpen ? "chevron-open" : ""}`} aria-hidden>
                    ›
                  </span>
                  <h2>Daily rituals</h2>
                  {dailyProgress && (
                    <span className="progress-pill">
                      {dailyProgress.done}/{dailyProgress.total}
                    </span>
                  )}
                </button>
                {dailyOpen && (
                  <ul className="task-list">
                    {dailyTasks.map((t) => (
                      <TaskItem key={t._id} task={t} {...itemHandlers} />
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className="section">
              <div className="section-head">
                <h2>Today</h2>
                {openTasks.length > 1 && (
                  <div className="seg seg-sm">
                    <button
                      className={sortMode === "priority" ? "seg-on" : ""}
                      onClick={() => setSort("priority")}
                    >
                      Priority
                    </button>
                    <button
                      className={sortMode === "manual" ? "seg-on" : ""}
                      onClick={() => setSort("manual")}
                    >
                      Manual
                    </button>
                  </div>
                )}
              </div>

              {openTasks.length === 0 ? (
                <div className="empty">Nothing here yet — add a task above.</div>
              ) : sortMode === "manual" ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={openTasks.map((t) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="task-list">
                      {openTasks.map((t) => (
                        <SortableTaskItem key={t._id} task={t} {...itemHandlers} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              ) : (
                <ul className="task-list">
                  {openTasks.map((t) => (
                    <TaskItem key={t._id} task={t} {...itemHandlers} />
                  ))}
                </ul>
              )}
            </section>

            {doneTasks.length > 0 && (
              <section className="section section-done">
                <div className="section-head">
                  <h2>Done</h2>
                  <span className="progress-pill">{doneTasks.length}</span>
                  <button className="text-btn" onClick={clearCompleted}>
                    Clear
                  </button>
                </div>
                <ul className="task-list">
                  {doneTasks.map((t) => (
                    <TaskItem key={t._id} task={t} {...itemHandlers} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
          </>
        )}

        <Footer />
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {editing && (
        <TaskEditor task={editing} onSave={saveEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
