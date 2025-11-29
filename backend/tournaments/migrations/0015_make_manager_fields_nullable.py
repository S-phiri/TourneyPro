# Generated manually to fix NOT NULL constraint on manager_name and manager_email

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0014_add_penalty_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='team',
            name='manager_name',
            field=models.CharField(blank=True, max_length=160, null=True),
        ),
        migrations.AlterField(
            model_name='team',
            name='manager_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
    ]

