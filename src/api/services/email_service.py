from brevo import AsyncBrevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)

from src.core.config import settings


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

            <p>Hello <strong>{buyer_name}</strong>,</p>

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