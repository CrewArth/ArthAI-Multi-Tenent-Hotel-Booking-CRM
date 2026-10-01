const eventDateLabel = (value) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

const statusLabel = (value) => value?.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Reserved';

export default function BanquetConflictDetails({ conflicts }) {
  if (!conflicts?.length) return null;

  return (
    <ul className="banquet-conflicts" aria-label="Conflicting reservations">
      {conflicts.map((conflict, index) => (
        <li key={`${conflict.eventDate}-${conflict.startTime}-${index}`}>
          <strong>{statusLabel(conflict.status)} · {conflict.eventName || 'Reserved event'}</strong>
          <span>{eventDateLabel(conflict.eventDate)} · {conflict.startTime}–{conflict.endTime}</span>
          {(conflict.setupBufferMinutes > 0 || conflict.cleanupBufferMinutes > 0) && (
            <small>
              Includes {[
                conflict.setupBufferMinutes > 0 && `${conflict.setupBufferMinutes} min setup`,
                conflict.cleanupBufferMinutes > 0 && `${conflict.cleanupBufferMinutes} min cleanup`,
              ].filter(Boolean).join(' and ')} time
            </small>
          )}
        </li>
      ))}
    </ul>
  );
}
