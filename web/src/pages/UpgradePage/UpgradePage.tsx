import { useEffect, useState } from "react";
import { getSubscriptionStatus, createPayment } from "@/services/subscription.service";
import "./UpgradePage.css";

type PlanName = "Free" | "Pro";

type Plan = {
    name: PlanName;
    price: string;
    description: string;
    badge?: string;
    features: string[];
    buttonText: string;
    popular?: boolean;
};

const plans: Plan[] = [
    {
        name: "Free",
        price: "$0",
        description: "For users who want to try basic stock tracking.",
        features: [
            "Basic stock watchlist",
            "Limited watchlist items",
            "Basic market data",
            "Community access",
        ],
        buttonText: "Free Plan",
    },
    {
        name: "Pro",
        price: "$1.9",
        description: "For active users who need more watchlist capacity.",
        badge: "Most Popular",
        popular: true,
        features: [
            "More watchlist items",
            "Advanced stock prediction",
            "Priority market insights",
            "Watchlist overflow protection",
            "Profile subscription badge",
        ],
        buttonText: "Upgrade to Pro",
    },
];

function UpgradePage() {
    const [currentPlan, setCurrentPlan] = useState<string>("Free");
    const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
    const [upgradingPlan, setUpgradingPlan] = useState<PlanName | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        const fetchSubscriptionStatus = async () => {
            try {
                setLoadingStatus(true);
                setErrorMessage("");

                // Gọi trực tiếp hàm đã import
                const statusData = await getSubscriptionStatus();

                if (statusData) {
                    const plan =
                        statusData.plan ||
                        statusData.subscription?.plan ||
                        statusData.subscription?.type ||
                        "Free";

                    setCurrentPlan(String(plan));
                }
            } catch (error) {
                console.error("Get subscription status error:", error);
                setErrorMessage("Cannot load subscription status.");
            } finally {
                setLoadingStatus(false);
            }
        };

        fetchSubscriptionStatus();
    }, []);

    const isCurrentPlan = (planName: PlanName) => {
        return currentPlan.toLowerCase() === planName.toLowerCase();
    };

    const getButtonText = (plan: Plan) => {
        if (loadingStatus) {
            return "Loading...";
        }

        if (isCurrentPlan(plan.name)) {
            return "Current Plan";
        }

        if (upgradingPlan === plan.name) {
            return "Processing...";
        }

        return plan.buttonText;
    };

    const handleUpgrade = async (planName: PlanName) => {
        if (planName === "Free" || isCurrentPlan(planName)) {
            return;
        }

        try {
            setUpgradingPlan(planName);
            setErrorMessage("");

            // Gọi trực tiếp hàm đã import
            const paymentData = await createPayment();

            if (paymentData?.checkoutUrl) {
                window.location.href = paymentData.checkoutUrl;
                return;
            }

            setErrorMessage("Cannot create payment.");
        } catch (error: any) {
            console.error("Create payment error:", error);
            setErrorMessage(error.message || "Failed to create payment. Please try again.");
        } finally {
            setUpgradingPlan(null);
        }
    };

    return (
        <main className="upgrade-page">
            <section className="upgrade-hero">
                <div className="upgrade-hero-content">
                    <span className="upgrade-label">Subscription Plans</span>

                    <h1>Upgrade your stock prediction experience</h1>

                    <p>
                        Choose a plan that fits your investment tracking needs. Unlock more
                        watchlist space, better AI insights, and advanced stock prediction
                        features.
                    </p>

                    {!loadingStatus && (
                        <div className="current-plan-box">
                            Current plan: <strong>{currentPlan}</strong>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="upgrade-error-message">{errorMessage}</div>
                    )}
                </div>
            </section>

            <section className="pricing-section">
                <div className="pricing-grid">
                    {plans.map((plan) => {
                        const current = isCurrentPlan(plan.name);

                        const disabled =
                            loadingStatus ||
                            current ||
                            plan.name === "Free" ||
                            upgradingPlan !== null;

                        return (
                            <article
                                key={plan.name}
                                className={`pricing-card ${plan.popular ? "popular-card" : ""
                                    } ${current ? "active-plan-card" : ""}`}
                            >
                                <div className="badge-row">
                                    <div>
                                        {current && (
                                            <span className="current-badge">Current</span>
                                        )}
                                    </div>

                                    <div>
                                        {plan.badge && (
                                            <span className="plan-badge">{plan.badge}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="plan-header">
                                    <h2>{plan.name}</h2>

                                    <div className="plan-price">
                                        <span>{plan.price}</span>
                                        <small>/ month</small>
                                    </div>

                                    <p>{plan.description}</p>
                                </div>

                                <ul className="feature-list">
                                    {plan.features.map((feature) => (
                                        <li key={feature}>
                                            <span className="check-icon">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`upgrade-btn ${current ? "current-btn" : ""
                                        } ${plan.name === "Free" && !current
                                            ? "disabled-free-btn"
                                            : ""
                                        }`}
                                    onClick={() => handleUpgrade(plan.name)}
                                    disabled={disabled}
                                >
                                    {getButtonText(plan)}
                                </button>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="upgrade-note">
                <h3>Why upgrade?</h3>
                <p>
                    Free accounts have limited watchlist capacity. Upgrading allows users
                    to track more stocks, access better prediction tools, and receive a
                    smoother experience across the platform.
                </p>
            </section>
        </main>
    );
}

export default UpgradePage;