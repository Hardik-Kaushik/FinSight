"""
Common salary calculation utilities shared across income module calculators.

Implements government-standard PF, HRA, Professional Tax rules.
"""

from typing import Any


def calculate_pf_contribution(
    basic_monthly: float,
    rules: dict[str, Any],
    pf_on_full_basic: bool = False,
) -> dict[str, float]:
    """
    Calculate PF contributions per government norms.

    Args:
        basic_monthly: Monthly basic salary
        pf_on_full_basic: If True, PF computed on full basic (common in IT companies).
                         If False, capped at PF wage ceiling (₹15,000).
    """
    pf_rules = rules["provident_fund"]
    ceiling = pf_rules["pf_wage_ceiling"]
    emp_rate = pf_rules["employee_contribution_percent"] / 100
    er_rate = pf_rules["employer_contribution_percent"] / 100
    eps_rate = pf_rules["employer_eps_percent"] / 100

    # PF wage base
    if pf_on_full_basic:
        pf_wage = basic_monthly
    else:
        pf_wage = min(basic_monthly, ceiling)

    employee_pf = round(pf_wage * emp_rate)
    employer_pf_total = round(pf_wage * er_rate)

    # Employer's 12% split: 8.33% to EPS (capped at ₹15000 wage), rest to EPF
    eps_wage = min(pf_wage, ceiling)
    employer_eps = round(eps_wage * eps_rate)
    employer_epf = employer_pf_total - employer_eps

    return {
        "pf_wage": round(pf_wage),
        "employee_pf_monthly": employee_pf,
        "employer_pf_monthly": employer_pf_total,
        "employer_eps_monthly": employer_eps,
        "employer_epf_monthly": employer_epf,
        "employee_pf_annual": employee_pf * 12,
        "employer_pf_annual": employer_pf_total * 12,
    }


def calculate_hra_exemption(
    basic_monthly: float,
    da_monthly: float,
    hra_received_monthly: float,
    rent_paid_monthly: float,
    is_metro: bool,
    rules: dict[str, Any],
) -> dict[str, float]:
    """
    Calculate HRA exemption as per Section 10(13A).

    Exemption is MINIMUM of:
    1. Actual HRA received
    2. Rent paid - 10% of (Basic + DA)
    3. 50% of (Basic + DA) for metro, 40% for non-metro
    """
    hra_rules = rules["hra"]
    basic_da = basic_monthly + da_monthly

    rule_1 = hra_received_monthly
    rule_2 = max(0, rent_paid_monthly - 0.10 * basic_da)
    metro_pct = hra_rules["metro_percent_of_basic"] / 100 if is_metro else hra_rules["non_metro_percent_of_basic"] / 100
    rule_3 = basic_da * metro_pct

    exemption_monthly = min(rule_1, rule_2, rule_3)

    return {
        "hra_received_monthly": round(hra_received_monthly),
        "rule_1_actual_hra": round(rule_1),
        "rule_2_rent_minus_10pct": round(rule_2),
        "rule_3_percent_of_basic_da": round(rule_3),
        "exemption_monthly": round(exemption_monthly),
        "exemption_annual": round(exemption_monthly * 12),
        "taxable_hra_monthly": round(hra_received_monthly - exemption_monthly),
        "taxable_hra_annual": round((hra_received_monthly - exemption_monthly) * 12),
    }


def calculate_professional_tax(
    gross_monthly: float,
    state: str,
    rules: dict[str, Any],
) -> dict[str, float]:
    """Calculate professional tax based on state rules."""
    pt_rules = rules["professional_tax"]
    state_rules = pt_rules["states"].get(state.lower(), pt_rules["states"]["default"])
    slabs = state_rules["slabs"]

    monthly_pt = 0
    for slab in slabs:
        slab_from = slab["from"]
        slab_to = slab["to"] if slab["to"] is not None else float("inf")
        if slab_from <= gross_monthly <= slab_to or (slab_to == float("inf") and gross_monthly >= slab_from):
            monthly_pt = slab["monthly"]
            break

    annual_pt = min(monthly_pt * 12, pt_rules["max_annual"])

    return {
        "monthly": monthly_pt,
        "annual": annual_pt,
        "state": state,
    }


def calculate_gratuity(
    basic_monthly: float,
    years_of_service: float,
    rules: dict[str, Any],
) -> dict[str, float]:
    """Calculate gratuity as per Payment of Gratuity Act."""
    gratuity_rules = rules["gratuity"]
    max_gratuity = gratuity_rules["max_gratuity"]
    min_years = gratuity_rules["eligible_after_years"]

    if years_of_service < min_years:
        return {
            "eligible": False,
            "gratuity_amount": 0,
            "years_of_service": years_of_service,
            "min_years_required": min_years,
        }

    # Formula: (Last drawn basic * 15 * years of service) / 26
    gratuity = (basic_monthly * 15 * years_of_service) / 26
    gratuity = min(gratuity, max_gratuity)

    return {
        "eligible": True,
        "gratuity_amount": round(gratuity),
        "years_of_service": years_of_service,
        "capped": gratuity >= max_gratuity,
    }
