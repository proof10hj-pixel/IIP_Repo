#!/usr/bin/env python3

"""Simple interest calculator."""


def calculate_simple_interest(principal: float, rate: float, time: float) -> float:
    """Return simple interest using I = P * R * T / 100."""
    return (principal * rate * time) / 100


def main() -> None:
    print("Simple Interest Calculator")
    principal = float(input("Enter principal amount: "))
    rate = float(input("Enter annual interest rate (%): "))
    time = float(input("Enter time (years): "))

    interest = calculate_simple_interest(principal, rate, time)
    total_amount = principal + interest

    print(f"\nSimple Interest: {interest:.2f}")
    print(f"Total Amount: {total_amount:.2f}")
    print(f"=== commit test ===")


if __name__ == "__main__":
    main()
