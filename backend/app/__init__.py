"""Utility functions for the datacat backend.

Currently this module only contains a tiny helper for sending e‑mail
notifications when a data‑consumer submits an access request.  The function
uses the standard library ``smtplib`` and reads the SMTP configuration from
``app.config.Settings``.
"""

import smtplib
from email.message import EmailMessage
from .config import settings


def send_email(to: str, subject: str, body: str) -> None:
	"""Send a simple plain‑text e‑mail.

	The function respects the SMTP settings defined in ``Settings``.  If the
	``smtp_user`` is empty the connection is made without authentication –
	suitable for a local development SMTP server.
	"""
	msg = EmailMessage()
	msg["From"] = settings.email_from
	msg["To"] = to
	msg["Subject"] = subject
	msg.set_content(body)

	with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
		if settings.smtp_user:
			server.starttls()
			server.login(settings.smtp_user, settings.smtp_password)
		server.send_message(msg)
