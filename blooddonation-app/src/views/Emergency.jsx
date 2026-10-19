import { useState } from 'react';
import {
	ArrowLeft,
	ArrowUpRight,
	CalendarClock,
	Check,
	Clock3,
	Droplet,
	MapPin,
	Phone,
	Plus,
	Search,
	ShieldCheck,
	UserRound,
} from 'lucide-react';
import {
	bookEmergencyRequest,
	createEmergencyRequest,
	getEmergencyRequests,
} from '../services/emergencyService';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const initialForm = {
	requesterName: 'John Doe',
	bloodType: 'A+',
	unitsNeeded: '1',
	neededBy: '',
	hospital: '',
	city: 'Quezon City',
	contactNumber: '+63 908 765 4321',
	message: '',
};

function formatNeededBy(value) {
	if (!value) return 'As soon as possible';
	return new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: value.includes('T') ? 'short' : undefined,
	}).format(new Date(value));
}

function phoneHref(number) {
	return `tel:${number.replace(/[^+\d]/g, '')}`;
}

export default function Emergency() {
	const [requests, setRequests] = useState(getEmergencyRequests);
	const [view, setView] = useState('feed');
	const [bloodFilter, setBloodFilter] = useState('all');
	const [selectedId, setSelectedId] = useState(null);
	const [form, setForm] = useState(initialForm);
	const [consent, setConsent] = useState(false);
	const [formError, setFormError] = useState('');
	const selectedRequest = requests.find((request) => request.id === selectedId);
	const visibleRequests = requests.filter((request) => (
		request.status === 'open' && (bloodFilter === 'all' || request.bloodType === bloodFilter)
	));

	function updateForm(event) {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: value }));
	}

	function submitRequest(event) {
		event.preventDefault();
		if (!consent) {
			setFormError('Please agree to share these details with potential donors.');
			return;
		}
		const request = createEmergencyRequest({ ...form, unitsNeeded: Number(form.unitsNeeded), sharingConsent: consent });
		setRequests((current) => [request, ...current]);
		setBloodFilter('all');
		setForm(initialForm);
		setConsent(false);
		setFormError('');
		setView('feed');
	}

	function confirmOffer() {
		if (!selectedRequest) return;
		const updated = bookEmergencyRequest(selectedRequest.id);
		if (!updated) return;
		setRequests((current) => current.map((request) => request.id === updated.id ? updated : request));
		setView('confirmed');
	}

	return (
		<section className="emergency-page" aria-labelledby="emergency-title">
			<header className="emergency-heading-row">
				<div>
					<p className="emergency-eyebrow"><span /> Live requests</p>
					<h1 id="emergency-title">Emergency blood support</h1>
					<p className="emergency-intro">Connect people who need blood with donors ready to help.</p>
				</div>
				<div className="emergency-heading-icon" aria-hidden="true"><Droplet size={25} /></div>
			</header>

			<div className="emergency-tabs" role="tablist" aria-label="Emergency request views">
				<button className={`emergency-tab${view === 'feed' ? ' is-active' : ''}`} onClick={() => setView('feed')} role="tab" aria-selected={view === 'feed'}>
					<Search size={17} /> Find a request
				</button>
				<button className={`emergency-tab${view === 'post' ? ' is-active' : ''}`} onClick={() => setView('post')} role="tab" aria-selected={view === 'post'}>
					<Plus size={17} /> Post a request
				</button>
			</div>

			{view === 'feed' && (
				<div className="emergency-content">
					<div className="emergency-feed-toolbar">
						<div><h2>People looking for donors</h2><p>{visibleRequests.length} open {visibleRequests.length === 1 ? 'request' : 'requests'}</p></div>
						<label className="blood-filter"><span>Blood type</span>
							<select value={bloodFilter} onChange={(event) => setBloodFilter(event.target.value)}>
								<option value="all">All types</option>
								{bloodTypes.map((type) => <option key={type}>{type}</option>)}
							</select>
						</label>
					</div>
					{visibleRequests.length ? (
						<div className="emergency-request-list">
							{visibleRequests.map((request) => (
								<article className="emergency-request" key={request.id}>
									<div className="request-type-badge"><Droplet size={16} />{request.bloodType}</div>
									<div className="request-main">
										<div className="request-title-row">
											<div><p className="requester-name"><UserRound size={15} />{request.requesterName}</p><h3>{request.unitsNeeded} {request.unitsNeeded === 1 ? 'donor' : 'donors'} needed</h3></div>
											<span className="request-open-status">Open</span>
										</div>
										<div className="request-facts">
											<span><MapPin size={15} />{request.hospital}, {request.city}</span>
											<span><CalendarClock size={15} />Needed by {formatNeededBy(request.neededBy)}</span>
										</div>
										<p className="request-message">{request.message}</p>
										<div className="request-actions">
											<button className="request-help-button" onClick={() => { setSelectedId(request.id); setView('booking'); }}>
												Offer to donate <ArrowUpRight size={16} />
											</button>
											<a className="request-contact-link" href={phoneHref(request.contactNumber)}><Phone size={15} />Contact requester</a>
										</div>
									</div>
								</article>
							))}
						</div>
					) : (
						<div className="emergency-empty-state"><Droplet size={25} /><h3>No open requests for this blood type</h3><p>Try another filter, or check back as new requests are posted.</p><button onClick={() => setBloodFilter('all')}>Show all requests</button></div>
					)}
					<p className="emergency-demo-note"><ShieldCheck size={15} /> Demo requests are stored only in this browser for now.</p>
				</div>
			)}

			{view === 'post' && (
				<form className="emergency-content emergency-form" onSubmit={submitRequest}>
					<div className="emergency-form-heading"><div><h2>Share a blood request</h2><p>Only details you enter and agree to share appear in the donor feed.</p></div><span className="form-step-label">REQUEST DETAILS</span></div>
					<div className="emergency-form-grid">
						<label className="emergency-field"><span>Name to display</span><input name="requesterName" value={form.requesterName} onChange={updateForm} required maxLength="80" /></label>
						<label className="emergency-field"><span>Blood type needed</span><select name="bloodType" value={form.bloodType} onChange={updateForm} required>{bloodTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
						<label className="emergency-field"><span>Number of donors</span><input name="unitsNeeded" type="number" min="1" max="20" value={form.unitsNeeded} onChange={updateForm} required /></label>
						<label className="emergency-field"><span>Needed by</span><input name="neededBy" type="datetime-local" value={form.neededBy} onChange={updateForm} /></label>
						<label className="emergency-field"><span>Hospital or donation center</span><input name="hospital" value={form.hospital} onChange={updateForm} required maxLength="120" placeholder="e.g. St. Luke's Medical Center" /></label>
						<label className="emergency-field"><span>City or area</span><input name="city" value={form.city} onChange={updateForm} required maxLength="80" /></label>
						<label className="emergency-field emergency-field-wide"><span>Contact number</span><input name="contactNumber" type="tel" value={form.contactNumber} onChange={updateForm} required maxLength="30" /></label>
						<label className="emergency-field emergency-field-wide"><span>Message for donors</span><textarea name="message" value={form.message} onChange={updateForm} required rows="3" maxLength="400" placeholder="Add useful context, without sharing private medical details." /></label>
					</div>
					<label className="sharing-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree to share the details above with potential donors so they can contact me about this request.</span></label>
					{formError && <p className="emergency-form-error" role="alert">{formError}</p>}
					<div className="emergency-form-footer"><p><ShieldCheck size={16} /> You can close a request by accepting a donor offer.</p><button className="emergency-submit-button" type="submit" disabled={!consent}>Publish request <ArrowUpRight size={16} /></button></div>
				</form>
			)}

			{view === 'booking' && selectedRequest && (
				<div className="emergency-content booking-content">
					<button className="booking-back-button" onClick={() => setView('feed')}><ArrowLeft size={16} /> Back to requests</button>
					<div className="booking-title"><span><Check size={18} /></span><div><h2>Review your offer</h2><p>Confirm you can help with this request.</p></div></div>
					<div className="booking-details">
						<div className="booking-person-row"><div className="booking-avatar"><UserRound size={20} /></div><div><strong>{selectedRequest.requesterName}</strong><span>Emergency request · {selectedRequest.bloodType}</span></div><span className="request-open-status">Open</span></div>
						<div className="booking-fact-grid">
							<div><span>Blood type</span><strong>{selectedRequest.bloodType}</strong></div><div><span>Donors needed</span><strong>{selectedRequest.unitsNeeded}</strong></div>
							<div><span>Hospital</span><strong>{selectedRequest.hospital}</strong></div><div><span>Location</span><strong>{selectedRequest.city}</strong></div>
							<div><span>Target time</span><strong><Clock3 size={15} />{formatNeededBy(selectedRequest.neededBy)}</strong></div><div><span>Request status</span><strong>Awaiting donor</strong></div>
						</div>
						<p className="booking-message">{selectedRequest.message}</p>
					</div>
					<div className="booking-actions"><a className="request-contact-link" href={phoneHref(selectedRequest.contactNumber)}><Phone size={16} />Call requester</a><button className="emergency-submit-button" onClick={confirmOffer}>Confirm my offer <Check size={16} /></button></div>
				</div>
			)}

			{view === 'confirmed' && selectedRequest && (
				<div className="emergency-content offer-confirmed">
					<span className="offer-confirmed-icon"><Check size={26} /></span><p className="emergency-eyebrow">OFFER RECORDED</p><h2>Thank you for stepping up.</h2>
					<p>Your offer for {selectedRequest.requesterName}'s {selectedRequest.bloodType} request has been recorded in this demo.</p>
					<div className="confirmed-contact"><span>Contact the requester to coordinate next steps</span><a href={phoneHref(selectedRequest.contactNumber)}><Phone size={16} />Call {selectedRequest.requesterName}</a></div>
					<button className="booking-back-button" onClick={() => setView('feed')}>Return to requests</button>
				</div>
			)}
		</section>
	);
}
