from brevo import AsyncBrevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)

from src.core.config import settings


# ============================================================
# TEST EMAIL
# ============================================================

async def send_test_email(recipient_email: str):
    client = AsyncBrevo(
        api_key=settings.BREVO_API_KEY
    )

    result = await client.transactional_emails.send_transac_email(
        subject="eSaka - Brevo Email Test",

        html_content="""
        <html>
            <body>
                <h2>eSaka Email Service Test</h2>

                <p>Hello!</p>

                <p>
                    This is a test email sent from the
                    <strong>eSaka FastAPI backend</strong>
                    using Brevo.
                </p>

                <p>
                    If you received this email, the Brevo
                    email service is working successfully.
                </p>

                <br>

                <p>
                    Regards,<br>
                    <strong>eSaka Region 3</strong>
                </p>
            </body>
        </html>
        """,

        sender=SendTransacEmailRequestSender(
            name=settings.BREVO_SENDER_NAME,
            email=settings.BREVO_SENDER_EMAIL,
        ),

        to=[
            SendTransacEmailRequestToItem(
                email=recipient_email,
                name="eSaka Test Recipient",
            )
        ],
    )

    return result.message_id


# ============================================================
# OFFTAKE REQUEST EMAIL
# ============================================================

async def send_offtake_request_email(
    buyer_email: str,
    buyer_name: str,
    commodity: str,
    quantity,
    selling_price,
    harvest_date,
    farmer_location: str,
):
    client = AsyncBrevo(
        api_key=settings.BREVO_API_KEY
    )

    html_content = f"""
    <html>
        <body>
            <h2>eSaka - New Offtake Request</h2>

            <p>
                Hello <strong>{buyer_name}</strong>,
            </p>

            <p>
                A farmer has submitted a new offtake request
                through the eSaka platform.
            </p>

            <h3>Offtake Request Details</h3>

            <p>
                <strong>Commodity:</strong> {commodity}<br>
                <strong>Quantity:</strong> {quantity}<br>
                <strong>Selling Price:</strong> {selling_price}<br>
                <strong>Expected Harvest Date:</strong> {harvest_date}<br>
                <strong>Farmer Location:</strong> {farmer_location}
            </p>

            <p>
                Please review the request and contact the farmer
                if you are interested.
            </p>

            <br>

            <p>
                Regards,<br>
                <strong>eSaka Region 3</strong>
            </p>
        </body>
    </html>
    """

    result = await client.transactional_emails.send_transac_email(
        subject="eSaka - New Offtake Request",

        html_content=html_content,

        sender=SendTransacEmailRequestSender(
            name=settings.BREVO_SENDER_NAME,
            email=settings.BREVO_SENDER_EMAIL,
        ),

        to=[
            SendTransacEmailRequestToItem(
                email=buyer_email,
                name=buyer_name,
            )
        ],
    )

    return result.message_id

# ============================================================
# VERIFIED BUYER APPROVAL EMAIL
# ============================================================

async def send_verified_buyer_email(
    buyer_email: str,
    contact_person: str,
    organization: str,
):
    client = AsyncBrevo(
        api_key=settings.BREVO_API_KEY
    )

    html_content = f"""
    <html>
        <body>

            <h2>eSaka - Verified Buyer Application Approved</h2>

            <p>
                Dear <strong>{contact_person}</strong>,
            </p>

            <p>
                We are pleased to inform you that your buyer
                registration for
                <strong>{organization}</strong>
                has been successfully reviewed and approved.
            </p>

            <p>
                You are now officially recognized as a
                <strong>Verified Buyer</strong>
                in the eSaka platform.
            </p>

            <h3>Application Details</h3>

            <p>
                <strong>Organization:</strong> {organization}<br>
                <strong>Contact Person:</strong> {contact_person}<br>
                <strong>Email:</strong> {buyer_email}<br>
                <strong>Status:</strong> Verified Buyer
            </p>

            <p>
                You may now participate in the eSaka platform
                and receive available agricultural supply and
                offtake opportunities from registered farmers.
            </p>

            <p>
                Thank you for registering with eSaka and
                becoming part of the agricultural supply network.
            </p>

            <br>

            <p>
                Regards,<br>
                <strong>eSaka Region 3</strong><br>
                Department of Agriculture - Regional Field Office
            </p>

        </body>
    </html>
    """

    result = await client.transactional_emails.send_transac_email(
        subject="eSaka - Your Buyer Application Has Been Approved",

        html_content=html_content,

        sender=SendTransacEmailRequestSender(
            name=settings.BREVO_SENDER_NAME,
            email=settings.BREVO_SENDER_EMAIL,
        ),

        to=[
            SendTransacEmailRequestToItem(
                email=buyer_email,
                name=contact_person,
            )
        ],
    )

    return result.message_id

# ============================================================
# PASSWORD RESET EMAIL
# ============================================================

async def send_password_reset_email(
    recipient_email: str,
    reset_link: str,
):
    client = AsyncBrevo(
        api_key=settings.BREVO_API_KEY
    )

    html_content = f"""
    <html>
        <body>

            <h2>eSaka - Password Reset</h2>

            <p>Hello,</p>

            <p>
                We received a request to reset your
                eSaka account password.
            </p>

            <p>
                Click the button below to create
                a new password:
            </p>

            <p>
                <a href="{reset_link}"
                   style="
                   display:inline-block;
                   padding:12px 20px;
                   background-color:#2e7d32;
                   color:white;
                   text-decoration:none;
                   border-radius:6px;
                   font-weight:bold;">
                    Reset Password
                </a>
            </p>

            <p>
                This password reset link will expire
                in <strong>30 minutes</strong>.
            </p>

            <p>
                If you did not request a password reset,
                you can safely ignore this email.
            </p>

            <br>

            <p>
                Regards,<br>
                <strong>eSaka Region 3</strong>
            </p>

        </body>
    </html>
    """

    result = await client.transactional_emails.send_transac_email(
        subject="eSaka - Password Reset",

        html_content=html_content,

        sender=SendTransacEmailRequestSender(
            name=settings.BREVO_SENDER_NAME,
            email=settings.BREVO_SENDER_EMAIL,
        ),

        to=[
            SendTransacEmailRequestToItem(
                email=recipient_email,
                name="eSaka User",
            )
        ],
    )

    return result.message_id