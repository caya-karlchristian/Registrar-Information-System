import puplogoimage from "../assets/puplogoimage.png";
import bagongPilipinasLogo from "../assets/Bagong_Pilipinas_logo.png";
import certificateFooter from "../assets/certificate_footer.png";

export const CERT_TEMPLATE_LAYOUT_CHANGED = "certificate-template-layout-changed";

export const DEFAULT_CERTIFICATE_LAYOUT = {
	headerLeftUrl: puplogoimage,
	headerRightUrl: bagongPilipinasLogo,
	footerUrls: [certificateFooter],
	headerLogoSize: 56,
	footerLogoSize: 56,
};

const coerceSize = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeUrlArray = (value) => {
	if (!Array.isArray(value)) return [];
	return value.filter((item) => typeof item === "string" && item.trim().length > 0);
};

export const normalizeCertificateLayout = (rawLayout) => {
	if (!rawLayout || typeof rawLayout !== "object") {
		return { ...DEFAULT_CERTIFICATE_LAYOUT };
	}

	const headerLeftUrl = rawLayout.layout_header_left_url ?? rawLayout.headerLeftUrl ?? DEFAULT_CERTIFICATE_LAYOUT.headerLeftUrl;
	const headerRightUrl = rawLayout.layout_header_right_url ?? rawLayout.headerRightUrl ?? DEFAULT_CERTIFICATE_LAYOUT.headerRightUrl;
	const footerUrls = normalizeUrlArray(rawLayout.layout_footer_urls ?? rawLayout.footerUrls);

	return {
		headerLeftUrl,
		headerRightUrl,
		footerUrls: footerUrls.length ? footerUrls : [...DEFAULT_CERTIFICATE_LAYOUT.footerUrls],
		headerLogoSize: coerceSize(
			rawLayout.layout_header_logo_size ?? rawLayout.headerLogoSize,
			DEFAULT_CERTIFICATE_LAYOUT.headerLogoSize
		),
		footerLogoSize: coerceSize(
			rawLayout.layout_footer_logo_size ?? rawLayout.footerLogoSize,
			DEFAULT_CERTIFICATE_LAYOUT.footerLogoSize
		),
	};
};

// Returns true for URLs that are safe to persist to the backend:
//   /storage/...          — relative storage path (local disk)
//   https?://...          — absolute URL (could be S3 or full APP_URL)
// Returns false for display-only values that must NOT be saved:
//   data:...              — base64 preview blob (upload still in flight)
//   /assets/...           — Vite-bundled frontend asset (hash-named, not a storage file)
//   anything else falsy
const isPersistableUrl = (url) => {
	if (!url || typeof url !== "string") return false;
	if (url.startsWith("data:"))    return false; // upload still in progress
	if (url.startsWith("/assets/")) return false; // Vite bundle — never persisted
	return true;
};

export const toLayoutPayload = (layout) => {
	const normalized = normalizeCertificateLayout(layout);
	return {
		// Send null for display-only defaults so the backend stores null and
		// serves the frontend's own bundled fallback — never store /assets/ paths.
		layout_header_left_url:  isPersistableUrl(normalized.headerLeftUrl)  ? normalized.headerLeftUrl  : null,
		layout_header_right_url: isPersistableUrl(normalized.headerRightUrl) ? normalized.headerRightUrl : null,
		layout_footer_urls:      normalized.footerUrls.filter(isPersistableUrl),
		layout_header_logo_size: normalized.headerLogoSize,
		layout_footer_logo_size: normalized.footerLogoSize,
	};
};
