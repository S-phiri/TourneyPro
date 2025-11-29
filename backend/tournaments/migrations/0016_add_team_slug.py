# Generated manually to add slug field to Team model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0015_make_manager_fields_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='slug',
            field=models.SlugField(blank=True, max_length=200, null=True, unique=True),
        ),
    ]

