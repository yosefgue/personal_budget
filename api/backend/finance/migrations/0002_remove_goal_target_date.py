from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="goal",
            name="target_date",
        ),
    ]
