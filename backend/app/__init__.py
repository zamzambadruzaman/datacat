"""Utility functions for the datacat backend.

Currently this module only contains a tiny helper for sending e‑mail
notifications when a data‑consumer submits an access request.  The function
uses the standard library ``smtplib`` and reads the SMTP configuration from
``app.config.Settings``.
"""

import logging
import smtplib
from email.message import EmailMessage
from .config import settings

logger = logging.getLogger("datacat")


def send_email(to: str, subject: str, body: str) -> None:
	"""Send a simple plain‑text e‑mail.

	The function respects the SMTP settings defined in ``Settings``.  If the
	``smtp_user`` is empty the connection is made without authentication –
	suitable for a local development SMTP server.

	Email delivery is best‑effort: it is a notification side effect, not part
	of the operation the caller is performing.  If SMTP is unconfigured or the
	server is unreachable, the failure is logged as a warning and swallowed so
	it never propagates to the caller.  This matches the documented behaviour
	that email notifications are silently skipped when SMTP is unavailable
	(see ``docs/configuration.md``).
	"""
	msg = EmailMessage()
	msg["From"] = settings.email_from
	msg["To"] = to
	msg["Subject"] = subject
	msg.set_content(body)

	try:
		with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
			if settings.smtp_user:
				server.starttls()
				server.login(settings.smtp_user, settings.smtp_password)
			server.send_message(msg)
	except OSError as exc:
		# Covers connection refused/unreachable SMTP and other socket errors.
		logger.warning("Skipping email notification to %s: SMTP send failed: %s", to, exc)
	except smtplib.SMTPException as exc:
		logger.warning("Skipping email notification to %s: SMTP error: %s", to, exc)
