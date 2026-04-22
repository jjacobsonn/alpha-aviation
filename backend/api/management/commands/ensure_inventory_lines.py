"""
Create missing InventoryPart rows so the Parts API (/company/inventories/detailed/) has data.

After the Inventory → InventoryPart schema split, older DBs often have Inventory buckets
but no line items. This command, for each company (or one company), ensures:

  * At least one Inventory row exists for the company.
  * Every Part linked to that company's aircraft has a matching InventoryPart line
    (defaults: quantity=0, stock_alert=0 unless --fill-defaults is used).

Safe to run multiple times (idempotent via get_or_create).
"""

from django.core.management.base import BaseCommand

from api.models import Company, Inventory, InventoryPart, Part


class Command(BaseCommand):
    help = "Backfill InventoryPart lines from catalog parts per company (fixes empty Parts page)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Only process this company primary key (default: all companies).",
        )
        parser.add_argument(
            "--fill-defaults",
            action="store_true",
            help="Set quantity=1 and stock_alert=2 for newly created lines (easier demos).",
        )

    def handle(self, *args, **options):
        company_id = options["company_id"]
        fill_defaults = options["fill_defaults"]

        companies = Company.objects.all().order_by("id")
        if company_id is not None:
            companies = companies.filter(pk=company_id)

        total_new = 0
        for company in companies:
            inv = (
                Inventory.objects.filter(company=company).order_by("id").first()
            )
            if inv is None:
                inv = Inventory.objects.create(company=company)
                self.stdout.write(
                    self.style.WARNING(
                        f"Company {company.id} ({company.name}): created Inventory bucket {inv.id}"
                    )
                )

            parts = Part.objects.filter(aircraft__company=company).distinct()
            for part in parts:
                defaults = {
                    "quantity": 1 if fill_defaults else 0,
                    "stock_alert": 2 if fill_defaults else 0,
                    "shop_location": "",
                }
                _obj, created = InventoryPart.objects.get_or_create(
                    inventory=inv,
                    part=part,
                    defaults=defaults,
                )
                if created:
                    total_new += 1

            count = InventoryPart.objects.filter(inventory__company=company).count()
            self.stdout.write(
                f"Company {company.id} ({company.name}): {count} inventory line(s)."
            )

        self.stdout.write(self.style.SUCCESS(f"Done. Created {total_new} new InventoryPart row(s)."))
