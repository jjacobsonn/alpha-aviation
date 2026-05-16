const DISCREPANCY_TITLE_RE = /^WO from Discrepancy #(\d+)(?::\s*)?(.*)$/i;

/**
 * Parse auto-generated titles from discrepancy → work order conversion.
 */
export function parseWorkOrderTitle(title) {
	const t = (title || '').trim();
	const match = t.match(DISCREPANCY_TITLE_RE);
	if (!match) {
		return { fromDiscrepancy: false, discrepancyId: null, summary: t };
	}
	return {
		fromDiscrepancy: true,
		discrepancyId: match[1],
		summary: (match[2] || '').trim(),
	};
}

function firstLine(text, maxLen) {
	const line = (text || '').trim().split(/\r?\n/)[0].trim();
	if (!line) return '';
	if (line.length <= maxLen) return line;
	return `${line.slice(0, maxLen - 1)}…`;
}

/**
 * Primary label for lists and dialogs — issue text, not boilerplate prefix.
 */
export function workOrderHeadline(row, maxLen = 72) {
	const { summary, fromDiscrepancy, discrepancyId } = parseWorkOrderTitle(row?.title);
	let headline = summary;

	if (!headline) {
		headline =
			firstLine(row?.description, maxLen) ||
			firstLine(row?.components_affected, maxLen) ||
			(fromDiscrepancy ? `Discrepancy #${discrepancyId}` : '');
	}

	if (!headline) {
		headline = `Work order #${row?.id ?? '—'}`;
	}

	if (headline.length > maxLen) {
		return `${headline.slice(0, maxLen - 1)}…`;
	}
	return headline;
}

/**
 * Short meta line under the headline (e.g. linked discrepancy).
 */
export function workOrderSourceLabel(row) {
	const { fromDiscrepancy, discrepancyId } = parseWorkOrderTitle(row?.title);
	if (fromDiscrepancy && discrepancyId) {
		return `From discrepancy #${discrepancyId}`;
	}
	return null;
}

/** Id from API work_order field (nested object or numeric id). */
export function workOrderRefId(woRef) {
	if (woRef == null || woRef === '') return null;
	if (typeof woRef === 'object') return woRef.id != null ? Number(woRef.id) : null;
	const n = Number(woRef);
	return Number.isFinite(n) ? n : null;
}

/** Human-readable label for a work order link. */
export function workOrderLinkLabel(woRef) {
	const id = workOrderRefId(woRef);
	if (id == null) return null;
	if (typeof woRef === 'object' && woRef != null) {
		const title = (woRef.title || '').trim();
		return title ? `#${id} — ${title}` : `#${id}`;
	}
	return `#${id}`;
}

/** Short label for a discrepancy link. */
export function discrepancyLinkLabel(d, maxLen = 56) {
	if (!d?.id) return null;
	const desc = firstLine(d.description, maxLen);
	return desc ? `#${d.id} — ${desc}` : `#${d.id}`;
}
