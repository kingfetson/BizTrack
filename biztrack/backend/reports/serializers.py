from rest_framework import serializers


class DateRangeSerializer(serializers.Serializer):
    """Validates ?start= and ?end= query params (YYYY-MM-DD)."""
    start = serializers.DateField(required=False, allow_null=True)
    end = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")
        if start and end and start > end:
            raise serializers.ValidationError("start must be before end.")
        return attrs


# ----- Output shapes (documentation only — not used for validation) -----

class SalesSummaryOutput(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    sale_count = serializers.IntegerField()
    item_count = serializers.IntegerField()
    avg_sale_value = serializers.DecimalField(max_digits=14, decimal_places=2)
    daily = serializers.ListField()
    top_products = serializers.ListField()
    payment_methods = serializers.ListField()


class InventoryReportOutput(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_units = serializers.IntegerField()
    total_value_at_cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_value_at_price = serializers.DecimalField(max_digits=14, decimal_places=2)
    low_stock_count = serializers.IntegerField()
    low_stock_items = serializers.ListField()
    out_of_stock_items = serializers.ListField()


class PurchasesSummaryOutput(serializers.Serializer):
    total_spend = serializers.DecimalField(max_digits=14, decimal_places=2)
    purchase_count = serializers.IntegerField()
    unpaid_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    by_supplier = serializers.ListField()
    monthly = serializers.ListField()


class ProfitReportOutput(serializers.Serializer):
    revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    cost_of_goods_sold = serializers.DecimalField(max_digits=14, decimal_places=2)
    gross_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    margin_percent = serializers.FloatField()
    by_product = serializers.ListField()