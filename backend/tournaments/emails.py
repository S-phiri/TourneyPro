# tournaments/emails.py
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def send_registration_confirmation(registration):
    """Send registration confirmation email to manager"""
    team = registration.team
    tournament = registration.tournament
    
    subject = f'Registration Confirmed: {team.name} - {tournament.name}'
    
    # Simple text email for now
    message = f"""
Hello {team.manager_name},

Your team "{team.name}" has been successfully registered for {tournament.name}.

Tournament Details:
- Location: {tournament.city}
- Dates: {tournament.start_date} to {tournament.end_date}
- Entry Fee: R{tournament.entry_fee}

Payment Status: {'Paid' if registration.status == 'paid' else 'Pending'}

Your registration is currently pending payment confirmation. Once payment is confirmed, you'll receive another email.

You can manage your team at: [Team Hub Link]

Best regards,
Tournament Management Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=strip_tags(message),
            from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@tournament.com',
            recipient_list=[team.manager_email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send registration email: {e}")
        return False

def send_payment_confirmation(registration):
    """Send payment confirmation email to manager"""
    team = registration.team
    tournament = registration.tournament
    
    subject = f'Payment Confirmed: {team.name} - {tournament.name}'
    
    message = f"""
Hello {team.manager_name},

Great news! Payment for your team "{team.name}" has been confirmed for {tournament.name}.

Payment Details:
- Amount Paid: R{registration.paid_amount}
- Tournament: {tournament.name}
- Dates: {tournament.start_date} to {tournament.end_date}

Your team is now fully registered and ready to compete!

You can manage your team at: [Team Hub Link]

Best regards,
Tournament Management Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=strip_tags(message),
            from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@tournament.com',
            recipient_list=[team.manager_email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send payment confirmation email: {e}")
        return False

def send_new_registration_notification(registration, organizer_email):
    """Send notification to organizer when a new team registers"""
    team = registration.team
    tournament = registration.tournament
    
    subject = f'New Team Registration: {team.name} - {tournament.name}'
    
    message = f"""
Hello Tournament Organizer,

A new team has registered for {tournament.name}:

Team Details:
- Team Name: {team.name}
- Manager: {team.manager_name}
- Email: {team.manager_email}
- Phone: {team.phone or 'Not provided'}
- Entry Fee: R{tournament.entry_fee}
- Status: Pending Payment

You can mark this registration as paid in your tournament dashboard once payment is received.

Best regards,
Tournament Management System
    """
    
    try:
        send_mail(
            subject=subject,
            message=strip_tags(message),
            from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@tournament.com',
            recipient_list=[organizer_email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send organizer notification: {e}")
        return False

