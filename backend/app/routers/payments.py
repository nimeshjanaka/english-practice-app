"""Payment routes for learners and admins."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin, get_current_user
from app.models.payment import Payment
from app.models.user import User, UserRole
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentUpdate

router = APIRouter()


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Payment:
    """Create a payment record for the logged-in user (starts as pending)."""
    payment = Payment(
        user_id=current_user.id,
        amount=payload.amount,
        currency=payload.currency.upper(),
        status="pending",
        gateway_transaction_id=payload.gateway_transaction_id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/me", response_model=list[PaymentResponse])
def list_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Payment]:
    """List payments belonging to the logged-in user."""
    return list(
        db.scalars(
            select(Payment)
            .where(Payment.user_id == current_user.id)
            .order_by(Payment.id.desc())
        ).all()
    )


@router.get("", response_model=list[PaymentResponse])
def list_all_payments(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Payment]:
    """List all payments (admin only)."""
    return list(db.scalars(select(Payment).order_by(Payment.id.desc())).all())


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Payment:
    """Get one payment — owner or admin only."""
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    if payment.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return payment


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Payment:
    """Update payment status / gateway id (admin only)."""
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)
    return payment
