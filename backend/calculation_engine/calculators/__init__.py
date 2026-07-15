"""Calculator plugins. Import all calculators here for auto-registration."""

from calculation_engine.calculators.income_tax import IncomeTaxCalculator
from calculation_engine.calculators.ctc_calculator import CTCCalculator
from calculation_engine.calculators.inhand_salary import InHandSalaryCalculator
from calculation_engine.calculators.salary_breakup import SalaryBreakupCalculator
from calculation_engine.calculators.offer_comparison import OfferComparisonCalculator
from calculation_engine.calculators.increment_calculator import IncrementCalculator
from calculation_engine.calculators.sip_calculator import SIPCalculator

__all__ = [
    "IncomeTaxCalculator",
    "CTCCalculator",
    "InHandSalaryCalculator",
    "SalaryBreakupCalculator",
    "OfferComparisonCalculator",
    "IncrementCalculator",
    "SIPCalculator",
]
