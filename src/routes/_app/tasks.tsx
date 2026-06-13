import { createFileRoute } from "@tanstack/react-router";
import { TasksView } from "@/components/tasks/TasksView";

// /tasks — the task center (scheduled / monitoring automations).
export const Route = createFileRoute("/_app/tasks")({
	component: TasksView,
});
