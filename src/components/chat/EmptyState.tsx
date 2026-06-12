// Empty / new-chat state: a single, light headline that invites the user to
// start a conversation. No logo or descriptive subline — kept deliberately bare.

export function EmptyState() {
  return (
    <div className="nb-empty" data-testid="new-chat-empty-state">
      <h1>聊点什么有趣的话题？</h1>
    </div>
  );
}
