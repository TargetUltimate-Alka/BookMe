import React, { useState } from 'react';
import { useEventDashboard } from '../../hooks/useEventDashboard.js';
import { useBudget } from '../../hooks/useBudget.js';
import { useChecklist } from '../../hooks/useChecklist.js';
import { useEvent } from '../../hooks/useEvent.js';
import { formatCurrency, formatDate, getDaysRemaining } from '../../utils/formatters.js';
import { BookingStatusBadge } from '../../components/BookingStatusBadge.jsx';
import { BudgetBar } from '../../components/BudgetBar.jsx';
import { BudgetTable } from '../../components/BudgetTable.jsx';
import { ChecklistItem } from '../../components/ChecklistItem.jsx';
import { BookingCard } from '../../components/BookingCard.jsx';
import { Modal } from '../../components/Modal.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { BookVendorModal } from '../../components/BookVendorModal.jsx';

export function EventDashboardPage({
  eventId,
  onNavigateBack,
  onNavigateToBooking,
  onFindVendors,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Load Aggregated Dashboard, Event details, Budget, and Checklist
  const { dashboard, loading: dashLoading, error: dashError, refetch: refetchDash } = useEventDashboard(eventId);
  const { budget, updating: budgetUpdating, updateBudget, refetch: refetchBudget } = useBudget(eventId);
  const { checklist, toggleItem, addItem, updateItem, deleteItem, actionLoading: checkLoading, refetch: refetchCheck } = useChecklist(eventId);
  const { event, updateEvent, cancelEvent, actionLoading: eventActionLoading, refetch: refetchEvent } = useEvent(eventId);

  // Modal States
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isBookVendorOpen, setIsBookVendorOpen] = useState(false);
  const [selectedVendorCategory, setSelectedVendorCategory] = useState('');

  // Form State for Event Edit
  const [editEventForm, setEditEventForm] = useState({
    name: '',
    event_date: '',
    budget: '',
    guest_count: '',
    city: '',
  });

  // Form State for Add Task
  const [newTaskForm, setNewTaskForm] = useState({
    task: '',
    category: 'General',
    due_date: '',
  });

  if (dashLoading) {
    return (
      <div className="eb-container">
        <Spinner message="Loading event dashboard..." />
      </div>
    );
  }

  if (dashError) {
    return (
      <div className="eb-container">
        <div className="eb-alert-banner eb-alert-danger">
          <span>Failed to load event dashboard: {dashError.message}</span>
        </div>
        {onNavigateBack && (
          <button type="button" className="eb-btn eb-btn-secondary" onClick={onNavigateBack}>
            ⬅ Back to Events
          </button>
        )}
      </div>
    );
  }

  const currentEvent = event || dashboard?.event;
  if (!currentEvent) {
    return (
      <div className="eb-container">
        <EmptyState title="Event Not Found" description="The requested event could not be found." />
      </div>
    );
  }

  const daysLeft = currentEvent.days_left !== undefined ? currentEvent.days_left : getDaysRemaining(currentEvent.event_date);
  const isPast = daysLeft !== null && daysLeft < 0;
  const progressPercent = dashboard?.progress?.percentage || 0;
  const bookingsList = dashboard?.bookings || [];

  const handleOpenEditEvent = () => {
    setEditEventForm({
      name: currentEvent.name || '',
      event_date: currentEvent.event_date ? currentEvent.event_date.split('T')[0] : '',
      budget: currentEvent.budget || '',
      guest_count: currentEvent.guest_count || '',
      city: currentEvent.city || '',
    });
    setIsEditEventOpen(true);
  };

  const handleSaveEditEvent = async () => {
    try {
      await updateEvent({
        name: editEventForm.name,
        event_date: editEventForm.event_date,
        budget: Number(editEventForm.budget),
        guest_count: Number(editEventForm.guest_count),
        city: editEventForm.city,
      });
      setIsEditEventOpen(false);
      refetchDash();
      refetchBudget();
    } catch (err) {
      alert(`Error updating event: ${err.message}`);
    }
  };

  const handleConfirmCancelEvent = async () => {
    try {
      await cancelEvent();
      setIsCancelConfirmOpen(false);
      refetchDash();
      refetchEvent();
    } catch (err) {
      alert(`Error cancelling event: ${err.message}`);
    }
  };

  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTaskForm.task.trim()) return;
    try {
      await addItem({
        task: newTaskForm.task.trim(),
        category: newTaskForm.category,
        due_date: newTaskForm.due_date || null,
      });
      setNewTaskForm({ task: '', category: 'General', due_date: '' });
      setIsAddTaskOpen(false);
      refetchDash();
    } catch (err) {
      alert(`Failed to add task: ${err.message}`);
    }
  };

  const handleSaveEditTask = async () => {
    if (!taskToEdit) return;
    try {
      await updateItem(taskToEdit.id, {
        task: taskToEdit.task,
        category: taskToEdit.category,
        due_date: taskToEdit.due_date || null,
      });
      setIsEditTaskOpen(false);
      setTaskToEdit(null);
      refetchDash();
    } catch (err) {
      alert(`Failed to update task: ${err.message}`);
    }
  };

  return (
    <div className="eb-container">
      {/* Top Navigation & Title Bar */}
      <div style={{ marginBottom: '1rem' }}>
        {onNavigateBack && (
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={onNavigateBack}
            style={{ paddingLeft: 0, marginBottom: '0.5rem' }}
          >
            ⬅ Back to My Events
          </button>
        )}
      </div>

      <div className="eb-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <span className="eb-badge" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
              {currentEvent.event_type}
            </span>
            <BookingStatusBadge status={currentEvent.status} />
            {daysLeft !== null && (
              <span className={`eb-badge ${isPast ? 'eb-badge-cancelled' : 'eb-badge-days'}`}>
                {isPast ? 'Past Event' : `⏳ ${daysLeft} Days Left`}
              </span>
            )}
          </div>

          <h1 className="eb-title">{currentEvent.name}</h1>
          <p className="eb-subtitle">
            📅 {formatDate(currentEvent.event_date)} &bull; 📍 {currentEvent.city || 'TBD'} &bull; 👥 {currentEvent.guest_count} guests
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {currentEvent.status !== 'CANCELLED' && (
            <>
              <button
                type="button"
                className="eb-btn eb-btn-secondary eb-btn-sm"
                onClick={handleOpenEditEvent}
              >
                ✏️ Edit Event
              </button>
              <button
                type="button"
                className="eb-btn eb-btn-ghost eb-btn-sm"
                style={{ color: '#ef4444' }}
                onClick={() => setIsCancelConfirmOpen(true)}
              >
                Cancel Event
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 Tabs: Overview, Bookings, Budget, Checklist */}
      <div className="eb-tabs">
        <button
          type="button"
          className={`eb-tab ${activeTab === 'overview' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          type="button"
          className={`eb-tab ${activeTab === 'bookings' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          🤝 Bookings ({bookingsList.length})
        </button>
        <button
          type="button"
          className={`eb-tab ${activeTab === 'budget' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveTab('budget')}
        >
          💰 Budget & Expenses
        </button>
        <button
          type="button"
          className={`eb-tab ${activeTab === 'checklist' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          📋 Checklist ({dashboard?.checklist?.completed || 0}/{dashboard?.checklist?.total || checklist.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Booking Progress Meter */}
          <div className="eb-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                  Event Readiness Progress
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {dashboard?.progress?.confirmed_categories || 0} of {dashboard?.progress?.total_budget_categories || 6} categories confirmed
                </span>
              </div>
              <strong style={{ fontSize: '1.25rem', color: '#4f46e5' }}>
                {Math.round(progressPercent)}%
              </strong>
            </div>

            <div className="eb-progress-wrap" style={{ height: '12px' }}>
              <div className="eb-progress-bar" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="eb-grid eb-grid-3">
            <div className="eb-card">
              <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Budget
              </span>
              <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', color: '#111827' }}>
                {formatCurrency(currentEvent.budget)}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#059669', display: 'block', marginTop: '0.25rem' }}>
                Actual spent: {formatCurrency(dashboard?.budget?.actual || 0)}
              </span>
            </div>

            <div className="eb-card">
              <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Checklist Status
              </span>
              <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', color: '#111827' }}>
                {dashboard?.checklist?.completed || 0} / {dashboard?.checklist?.total || 0}
              </h2>
              <span style={{ fontSize: '0.8rem', color: dashboard?.checklist?.overdue > 0 ? '#dc2626' : '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                {dashboard?.checklist?.overdue > 0 ? `⚠️ ${dashboard.checklist.overdue} overdue items` : 'All tasks on schedule'}
              </span>
            </div>

            <div className="eb-card">
              <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Active Bookings
              </span>
              <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', color: '#111827' }}>
                {bookingsList.length}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#4f46e5', display: 'block', marginTop: '0.25rem' }}>
                {bookingsList.filter((b) => b.status === 'CONFIRMED').length} confirmed contracts
              </span>
            </div>
          </div>

          {/* Budget Overview Preview */}
          <div className="eb-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                Budget Overview
              </h3>
              <button
                type="button"
                className="eb-btn eb-btn-ghost eb-btn-sm"
                onClick={() => setActiveTab('budget')}
              >
                View Full Breakdown ➔
              </button>
            </div>
            <BudgetBar
              totalBudget={dashboard?.budget?.total || currentEvent.budget}
              plannedTotal={dashboard?.budget?.planned || currentEvent.budget}
              actualTotal={dashboard?.budget?.actual || 0}
              overBudget={dashboard?.budget?.overBudget}
            />
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                Vendor Bookings for {currentEvent.name}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                All services contracted or requested for this event.
              </p>
            </div>

            <button
              type="button"
              className="eb-btn eb-btn-primary eb-btn-sm"
              onClick={() => {
                setSelectedVendorCategory('');
                setIsBookVendorOpen(true);
              }}
            >
              + Book a Vendor
            </button>
          </div>

          {bookingsList.length === 0 ? (
            <EmptyState
              icon="🤝"
              title="No vendors booked yet"
              description="Explore verified vendors across Venue, Catering, Photography, Decor, and Music to lock your event dates."
              actionText="+ Book First Vendor"
              onAction={() => setIsBookVendorOpen(true)}
            />
          ) : (
            <div className="eb-grid eb-grid-3">
              {bookingsList.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewDetails={onNavigateToBooking}
                />
              ))}
            </div>
          )}

          {/* Category Finder Links */}
          <div className="eb-card" style={{ background: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
              🔍 Find Vendors by Required Category
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['Venue & Catering', 'Photography & Video', 'Decoration & Floral', 'Music & Entertainment', 'Makeup & Styling'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="eb-btn eb-btn-secondary eb-btn-sm"
                    onClick={() => {
                      setSelectedVendorCategory(cat);
                      setIsBookVendorOpen(true);
                    }}
                  >
                    Find {cat} ➔
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUDGET */}
      {activeTab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="eb-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
              Budget Health & Spend Ratio
            </h3>
            <BudgetBar
              totalBudget={budget?.totalBudget || currentEvent.budget}
              plannedTotal={budget?.plannedTotal || currentEvent.budget}
              actualTotal={budget?.actualTotal || 0}
              overBudget={budget?.overBudget}
            />
          </div>

          <div className="eb-card">
            <BudgetTable
              budget={budget}
              onUpdateBudget={updateBudget}
              updating={budgetUpdating}
            />
          </div>
        </div>
      )}

      {/* TAB 4: CHECKLIST */}
      {activeTab === 'checklist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                Planning Milestone Tasks
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                Tasks auto-calculated based on your event date. Tick items as you finish them.
              </p>
            </div>

            <button
              type="button"
              className="eb-btn eb-btn-primary eb-btn-sm"
              onClick={() => setIsAddTaskOpen(true)}
            >
              + Add Custom Task
            </button>
          </div>

          {checklist.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No checklist tasks"
              description="Your checklist is empty. Add milestones to stay organized."
              actionText="+ Add Task"
              onAction={() => setIsAddTaskOpen(true)}
            />
          ) : (
            <div>
              {checklist.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={async (id) => {
                    try {
                      await toggleItem(id);
                      refetchDash();
                    } catch (err) {
                      console.error('Checklist toggle error:', err);
                    }
                  }}
                  onEdit={(it) => {
                    setTaskToEdit({ ...it });
                    setIsEditTaskOpen(true);
                  }}
                  onDelete={async (id) => {
                    if (window.confirm('Delete this checklist task?')) {
                      await deleteItem(id);
                      refetchDash();
                    }
                  }}
                  actionLoading={checkLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Event Modal */}
      <Modal
        isOpen={isEditEventOpen}
        onClose={() => setIsEditEventOpen(false)}
        title="Edit Event Details"
        footer={
          <>
            <button
              type="button"
              className="eb-btn eb-btn-secondary"
              onClick={() => setIsEditEventOpen(false)}
              disabled={eventActionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={handleSaveEditEvent}
              disabled={eventActionLoading}
            >
              {eventActionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="eb-form-group">
            <label className="eb-label">Event Name</label>
            <input
              type="text"
              className="eb-input"
              value={editEventForm.name}
              onChange={(e) => setEditEventForm({ ...editEventForm, name: e.target.value })}
            />
          </div>

          <div className="eb-form-group">
            <label className="eb-label">Event Date</label>
            <input
              type="date"
              className="eb-input"
              value={editEventForm.event_date}
              onChange={(e) => setEditEventForm({ ...editEventForm, event_date: e.target.value })}
            />
          </div>

          <div className="eb-grid eb-grid-2">
            <div className="eb-form-group">
              <label className="eb-label">Budget (₹)</label>
              <input
                type="number"
                className="eb-input"
                value={editEventForm.budget}
                onChange={(e) => setEditEventForm({ ...editEventForm, budget: e.target.value })}
              />
            </div>
            <div className="eb-form-group">
              <label className="eb-label">Guest Count</label>
              <input
                type="number"
                className="eb-input"
                value={editEventForm.guest_count}
                onChange={(e) => setEditEventForm({ ...editEventForm, guest_count: e.target.value })}
              />
            </div>
          </div>

          <div className="eb-form-group">
            <label className="eb-label">City</label>
            <input
              type="text"
              className="eb-input"
              value={editEventForm.city}
              onChange={(e) => setEditEventForm({ ...editEventForm, city: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Cancel Event Confirmation */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancelEvent}
        title="Cancel Entire Event"
        message={`Are you sure you want to cancel "${currentEvent.name}"? This action cannot be undone.`}
        confirmText="Yes, Cancel Event"
        confirmVariant="eb-btn-danger"
        loading={eventActionLoading}
      />

      {/* Add Custom Task Modal */}
      <Modal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title="Add Checklist Task"
        footer={
          <>
            <button
              type="button"
              className="eb-btn eb-btn-secondary"
              onClick={() => setIsAddTaskOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={handleAddTaskSubmit}
            >
              Add Task
            </button>
          </>
        }
      >
        <form onSubmit={handleAddTaskSubmit}>
          <div className="eb-form-group">
            <label className="eb-label">Task Description *</label>
            <input
              type="text"
              className="eb-input"
              placeholder="e.g. Confirm wedding cake design"
              value={newTaskForm.task}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, task: e.target.value })}
              required
            />
          </div>

          <div className="eb-grid eb-grid-2">
            <div className="eb-form-group">
              <label className="eb-label">Category</label>
              <input
                type="text"
                className="eb-input"
                placeholder="e.g. Catering, Logistics"
                value={newTaskForm.category}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
              />
            </div>

            <div className="eb-form-group">
              <label className="eb-label">Due Date</label>
              <input
                type="date"
                className="eb-input"
                value={newTaskForm.due_date}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      {taskToEdit && (
        <Modal
          isOpen={isEditTaskOpen}
          onClose={() => {
            setIsEditTaskOpen(false);
            setTaskToEdit(null);
          }}
          title="Edit Task"
          footer={
            <>
              <button
                type="button"
                className="eb-btn eb-btn-secondary"
                onClick={() => {
                  setIsEditTaskOpen(false);
                  setTaskToEdit(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="eb-btn eb-btn-primary"
                onClick={handleSaveEditTask}
              >
                Save Changes
              </button>
            </>
          }
        >
          <div className="eb-form-group">
            <label className="eb-label">Task Description</label>
            <input
              type="text"
              className="eb-input"
              value={taskToEdit.task}
              onChange={(e) => setTaskToEdit({ ...taskToEdit, task: e.target.value })}
            />
          </div>
          <div className="eb-grid eb-grid-2">
            <div className="eb-form-group">
              <label className="eb-label">Category</label>
              <input
                type="text"
                className="eb-input"
                value={taskToEdit.category || ''}
                onChange={(e) => setTaskToEdit({ ...taskToEdit, category: e.target.value })}
              />
            </div>
            <div className="eb-form-group">
              <label className="eb-label">Due Date</label>
              <input
                type="date"
                className="eb-input"
                value={taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : ''}
                onChange={(e) => setTaskToEdit({ ...taskToEdit, due_date: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Book Vendor Modal */}
      <BookVendorModal
        isOpen={isBookVendorOpen}
        onClose={() => setIsBookVendorOpen(false)}
        initialEventId={currentEvent.id}
        vendorInfo={{
          category: selectedVendorCategory || 'General Service',
          vendorName: selectedVendorCategory ? `${selectedVendorCategory} Specialists` : 'Sunset Studio',
          packageName: 'Premium Event Package',
          price: 75000,
        }}
        onSuccess={() => {
          refetchDash();
          refetchBudget();
          setActiveTab('bookings');
        }}
      />
    </div>
  );
}
