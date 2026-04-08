"""
Generate DEMO_SPEECH.docx (and PDF) from structured content.
Run: python generate_demo_doc.py
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy, os

# ── Colour palette ────────────────────────────────────────────
C_DARK      = RGBColor(0x0F, 0x17, 0x2A)   # near-black navy
C_BLUE      = RGBColor(0x1E, 0x40, 0xAF)   # deep blue (headings)
C_ACCENT    = RGBColor(0x38, 0xBD, 0xF8)   # sky blue (labels)
C_GREEN     = RGBColor(0x16, 0xA3, 0x4A)   # success green
C_ORANGE    = RGBColor(0xEA, 0x58, 0x0C)   # behind-the-scenes
C_GREY_BG   = RGBColor(0xF1, 0xF5, 0xF9)   # shaded cell
C_WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
C_TEXT      = RGBColor(0x1E, 0x29, 0x3B)
C_MUTED     = RGBColor(0x64, 0x74, 0x8B)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DOCX   = os.path.join(SCRIPT_DIR, "Digital_Identity_System_Demo_Speech.docx")
OUT_PDF    = os.path.join(SCRIPT_DIR, "Digital_Identity_System_Demo_Speech.pdf")

# ── Helpers ───────────────────────────────────────────────────

def set_cell_bg(cell, hex_color: str):
    """Set table cell background colour via XML."""
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement("w:shd")
    shd.set(qn("w:val"),   "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"),  hex_color)
    tcPr.append(shd)

def add_run(para, text, bold=False, italic=False, color=None, size=None, font="Calibri"):
    run = para.add_run(text)
    run.bold   = bold
    run.italic = italic
    run.font.name = font
    if color: run.font.color.rgb = color
    if size:  run.font.size = Pt(size)
    return run

def heading(doc, text, level=1, color=C_BLUE, size=None, space_before=18, space_after=6):
    sizes = {1: 22, 2: 16, 3: 13, 4: 11}
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after  = Pt(space_after)
    add_run(p, text, bold=True, color=color,
            size=size or sizes.get(level, 12), font="Calibri")
    return p

def body(doc, text, italic=False, color=C_TEXT, size=11, space_after=6, indent=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_after  = Pt(space_after)
    if indent:
        p.paragraph_format.left_indent = Cm(indent)
    add_run(p, text, italic=italic, color=color, size=size)
    return p

def divider(doc, color="C8D3DF"):
    """Thin horizontal rule via a 1-row, 1-cell table with a bottom border."""
    tbl  = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.cell(0, 0)
    cell.text = ""
    set_cell_bg(cell, color)
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{side}")
        b.set(qn("w:val"),  "none")
        b.set(qn("w:sz"),   "0")
        b.set(qn("w:space"),"0")
        b.set(qn("w:color"),"auto")
        tcBorders.append(b)
    tcPr.append(tcBorders)
    row_tr  = tbl.rows[0]._tr
    trPr    = row_tr.get_or_add_trPr()
    trHt    = OxmlElement("w:trHeight")
    trHt.set(qn("w:val"), "120")
    trPr.append(trHt)
    doc.add_paragraph()

def say_box(doc, lines):
    """Shaded blue-tinted box for [SAY] speech."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.cell(0, 0)
    set_cell_bg(cell, "EFF6FF")
    p_label = cell.paragraphs[0]
    add_run(p_label, "SPEECH  ", bold=True, color=C_BLUE, size=9)
    for line in lines:
        if line.strip() == "":
            cell.add_paragraph("")
        else:
            p = cell.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.3)
            add_run(p, line, italic=True, color=C_TEXT, size=11)
    doc.add_paragraph()

def show_box(doc, steps):
    """Green-tinted box for [SHOW] instructions."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.cell(0, 0)
    set_cell_bg(cell, "F0FDF4")
    p_label = cell.paragraphs[0]
    add_run(p_label, "ON SCREEN  ", bold=True, color=C_GREEN, size=9)
    for step in steps:
        p = cell.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.3)
        add_run(p, "▶  " + step, color=C_TEXT, size=11)
    doc.add_paragraph()

def bts_box(doc, lines):
    """Orange-tinted box for >> BEHIND THE SCENES callouts."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.cell(0, 0)
    set_cell_bg(cell, "FFF7ED")
    p_label = cell.paragraphs[0]
    add_run(p_label, ">> BEHIND THE SCENES  ", bold=True, color=C_ORANGE, size=9)
    for line in lines:
        if line.strip() == "":
            cell.add_paragraph("")
        else:
            p = cell.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.3)
            add_run(p, line, color=C_TEXT, size=10.5)
    doc.add_paragraph()

def simple_table(doc, headers, rows, col_widths=None):
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.style = "Table Grid"
    # Header row
    hdr = tbl.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_bg(cell, "1E40AF")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(p, h, bold=True, color=C_WHITE, size=10)
    # Data rows
    for ri, row_data in enumerate(rows):
        tr = tbl.rows[ri + 1]
        bg = "F8FAFC" if ri % 2 == 0 else "FFFFFF"
        for ci, val in enumerate(row_data):
            cell = tr.cells[ci]
            set_cell_bg(cell, bg)
            add_run(cell.paragraphs[0], val, size=10, color=C_TEXT)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in tbl.rows:
                row.cells[i].width = Inches(w)
    doc.add_paragraph()

# ── Build document ────────────────────────────────────────────

doc = Document()

# Page margins
for section in doc.sections:
    section.top_margin    = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin   = Cm(2.5)
    section.right_margin  = Cm(2.5)

# Default paragraph spacing
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)
style.paragraph_format.space_after = Pt(6)

# ══════════════════════════════════════════════════════════════
#  COVER PAGE
# ══════════════════════════════════════════════════════════════
doc.add_paragraph()
doc.add_paragraph()

title_p = doc.add_paragraph()
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(title_p, "Digital Identity System", bold=True, color=C_BLUE, size=28)

sub_p = doc.add_paragraph()
sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(sub_p, "Demonstrator Speech & Technical Guide", bold=False, color=C_MUTED, size=14)

doc.add_paragraph()
tag_p = doc.add_paragraph()
tag_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(tag_p, "Sri Lanka National Digital Identity Platform", italic=True, color=C_TEXT, size=12)

doc.add_paragraph()
tech_p = doc.add_paragraph()
tech_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(tech_p, "Hyperledger Fabric  ·  Biometric Face Recognition  ·  FIDO2 / WebAuthn",
        color=C_MUTED, size=11)

doc.add_paragraph()
doc.add_paragraph()
note_p = doc.add_paragraph()
note_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(note_p,
        "Each scene has an ON SCREEN cue (what to show), a SPEECH block (what to say),\n"
        "and a BEHIND THE SCENES callout (technical depth for examiner questions).\n"
        "Estimated demo time: 15 – 20 minutes",
        italic=True, color=C_MUTED, size=10)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════
#  OPENING
# ══════════════════════════════════════════════════════════════
heading(doc, "Opening Statement", level=1, space_before=6)

say_box(doc, [
    '"What I have built here is a national-level digital identity platform — designed for',
    'Sri Lanka — that solves a real-world problem: how do you securely prove who you are,',
    'in a way that cannot be faked, tampered with, or stolen?',
    "",
    "The system combines three cutting-edge technologies:",
    "  —  Hyperledger Fabric, a permissioned blockchain for tamper-proof identity records",
    "  —  Biometric face recognition, so your identity is tied to your physical appearance",
    "  —  FIDO2 / WebAuthn passkeys, the same standard used by Google and Apple",
    "",
    "There are three portals. I will walk through each one:",
    "  First  — the Admin Portal, where identity applications are reviewed and approved.",
    "  Second — the Citizen Portal, where a person registers, authenticates, and controls data.",
    '  Third  — the Organization Portal, where a verified institution accesses citizen data."',
])

doc.add_page_break()

# ══════════════════════════════════════════════════════════════
#  PORTAL 1 — ADMIN PORTAL
# ══════════════════════════════════════════════════════════════
banner = doc.add_paragraph()
banner.alignment = WD_ALIGN_PARAGRAPH.CENTER
tbl = doc.add_table(rows=1, cols=1)
tbl.style = "Table Grid"
c = tbl.cell(0, 0)
set_cell_bg(c, "1E3A5F")
p = c.paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p, "PORTAL 1  —  ADMIN PORTAL", bold=True, color=C_WHITE, size=16)
p2 = c.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p2, "http://localhost:3000", color=C_ACCENT, size=11)
doc.add_paragraph()

# Scene 1
heading(doc, "Scene 1  —  Admin Login", level=2)
show_box(doc, [
    "Open http://localhost:3000",
    "Show the login screen — observe no credential hints are visible",
    "Log in with: admin / Admin@2025",
])
say_box(doc, [
    '"This is the Admin Portal — the control centre for the entire identity system.',
    'Only a system administrator has credentials to access this.',
    "",
    "The login is standard username and password. Notice there are no hints or credential",
    'leaks visible. All credential management is handled through environment configuration."',
])

# Scene 2
heading(doc, "Scene 2  —  Dashboard Overview", level=2)
show_box(doc, [
    "Land on the Dashboard — point to each panel as you speak",
    "Highlight: stats row, weekly chart, accuracy donuts, infrastructure health",
])
say_box(doc, [
    '"The dashboard gives the administrator a live view of the entire system.',
    "",
    "At the top — total registered citizens, active organizations, verified blockchain",
    "identities, and pending applications.",
    "",
    "Below that — weekly verification activity showing daily operation volume.",
    "",
    "On the right — two accuracy metrics. Our biometric system achieves 99.8% accuracy",
    "for face recognition and 99.4% for liveness detection — meaning it can detect if",
    "someone is showing a photograph instead of a real face.",
    "",
    "At the bottom — infrastructure health. It shows in real time whether the blockchain",
    'peer is online, whether the databases are responding, and whether the biometric service is running."',
])
bts_box(doc, [
    "The blockchain status is checked by attempting an actual query against the Hyperledger",
    "Fabric peer node. If the peer is offline, the system degrades gracefully — portals",
    "continue to function but blockchain operations are deferred until recovery.",
])

# Scene 3
heading(doc, "Scene 3  —  Registration Review & Approval", level=2)
show_box(doc, [
    "Click Registrations in the sidebar",
    "Show filter tabs: ALL / PENDING / APPROVED / REJECTED",
    "Click Review on a PENDING registration",
    "Click Approve & Create DID",
])
say_box(doc, [
    '"This is the most critical function of the admin portal — reviewing citizen identity',
    "applications. Each row shows the citizen's ID, name, NIC number, and submission date.",
    "",
    "The review panel shows everything the citizen submitted. Notice the Biometric field",
    "shows Enrolled — confirming face data was captured during registration. The raw",
    "biometric vector is not displayed here for security. Developers can inspect it via",
    "the browser console.",
    "",
    'When satisfied, the administrator clicks Approve and Create DID."',
])
bts_box(doc, [
    "In this single click, FIVE things happen simultaneously:",
    "",
    "1. A Decentralized Identifier is generated: did:fabric:{citizenId}",
    "   This is the citizen's permanent blockchain address.",
    "",
    "2. The Identity Chaincode is invoked with CreateIdentity() — writing the citizen's",
    "   record permanently to the Hyperledger Fabric ledger. It cannot be modified or deleted.",
    "",
    "3. An Audit Event is logged to the Audit Chaincode — recording admin, action",
    "   IDENTITY_CREATED, and timestamp. This audit trail is also immutable.",
    "",
    "4. A QR code is generated containing the citizen's DID and identity snapshot,",
    "   used for offline verification scenarios.",
    "",
    "5. The citizen receives a notification in their portal confirming approval.",
])

# Scene 4
heading(doc, "Scene 4  —  Audit Log", level=2)
show_box(doc, [
    "Click Audit Log in the sidebar",
    "Point to: Tx Hash, Citizen ID, Actor, Operation, Timestamp, Status columns",
    "Type a Citizen ID in the search box to filter their personal trail",
])
say_box(doc, [
    '"Every significant action in the system is recorded here — permanently, on the blockchain.',
    "",
    "The Status column shows COMMITTED for all records. This means the transaction has been",
    "validated by the Hyperledger Fabric consensus protocol and written to the distributed",
    "ledger across all peer nodes.",
    "",
    "Once committed, no one — not even the administrator — can alter or delete these records.",
    "",
    "I can filter by a specific citizen to see their complete history — every login, every",
    'data access, every consent grant or revocation. Full transparency."',
])
bts_box(doc, [
    "The audit chaincode stores events under composite keys: AUDIT_{citizenId}_{eventId}.",
    "A range query returns all events ordered by time. Since every Fabric peer holds an",
    "identical copy of the ledger, falsification is computationally impossible — it would",
    "require compromising the consensus of all peer nodes simultaneously.",
])

# Scene 5
heading(doc, "Scene 5  —  System Evaluation", level=2)
show_box(doc, [
    "Click Evaluation in the sidebar",
    "Point to system status, then run Blockchain Latency Test",
    "Show Biometric Performance Metrics table",
])
say_box(doc, [
    '"The evaluation page benchmarks system performance — important for my research contribution.',
    "",
    "The Blockchain Latency Test measures query response time against the Hyperledger Fabric",
    "ledger. The Transaction Throughput Test measures write transactions per second.",
    "",
    "The Biometric Performance Metrics compare three authentication modes.",
    "Single-factor face recognition has good accuracy. But in multimodal fusion —",
    "face plus device key — the False Acceptance Rate drops dramatically, giving us",
    'the highest security with the lowest false rejection rate."',
])

doc.add_page_break()

# ══════════════════════════════════════════════════════════════
#  PORTAL 2 — CITIZEN PORTAL
# ══════════════════════════════════════════════════════════════
tbl2 = doc.add_table(rows=1, cols=1)
tbl2.style = "Table Grid"
c2 = tbl2.cell(0, 0)
set_cell_bg(c2, "14532D")
p3 = c2.paragraphs[0]
p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p3, "PORTAL 2  —  CITIZEN PORTAL", bold=True, color=C_WHITE, size=16)
p4 = c2.add_paragraph()
p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p4, "http://localhost:3002", color=RGBColor(0x86, 0xEF, 0xAC), size=11)
doc.add_paragraph()

# Scene 6
heading(doc, "Scene 6  —  Citizen Registration (4 Steps)", level=2)
show_box(doc, [
    "Open http://localhost:3002 → click Register",
    "Step 1: Fill personal details (name, NIC, email, password)",
    "Step 2: Fill contact & address",
    "Step 3: Start camera → capture face → show green success badge",
    "Step 4: Click Register Device Key → complete OS security prompt",
])
say_box(doc, [
    '"A citizen visits this portal for the first time to create their digital identity.',
    "Registration is a four-step process.",
    "",
    "Step one — basic personal information: name as on NIC, NIC number, email, password.",
    "",
    "Step two — contact and address details.",
    "",
    "Step three — this is the critical step: Biometric Enrollment. The citizen positions",
    "their face inside the oval guide on screen. When they click Capture, the system",
    "takes a snapshot and processes it through our biometric pipeline.",
    "",
    "Step four — setting up a Device Key. This implements the FIDO2 / WebAuthn standard —",
    "the same technology behind Windows Hello, Apple Face ID, and Google Passkeys.",
    "The operating system shows its native security prompt for confirmation.",
    "",
    'The registration is now complete. The application goes to the admin for review."',
])
bts_box(doc, [
    "During biometric enrollment, the captured image is sent to the Python Flask biometric",
    "service (port 5001). Three operations are performed:",
    "",
    "1. Face Detection — Haar Cascade classifier locates the face region in the image.",
    "",
    "2. Preprocessing — face is cropped, converted to grayscale, resized to 128×128 pixels.",
    "",
    "3. HOG Descriptor — Histogram of Oriented Gradients divides the face into small cells",
    "   and computes gradient directions and magnitudes. The result is a feature vector of",
    "   8,100 floating-point numbers that mathematically describes the face structure.",
    "   This vector is base64-encoded (~43 KB) and stored as the biometric template.",
    "   No photo is stored — only the mathematical description.",
    "",
    "For WebAuthn: the authenticator generates an ES256 key pair. The private key never",
    "leaves the device. The public key + counter are stored in the CitizenCredential table.",
    "The counter prevents replay attacks — it increments on every authentication.",
])

# Scene 7
heading(doc, "Scene 7  —  Citizen Login (3-Factor Authentication)", level=2)
show_box(doc, [
    "Click Sign In → show 3-step login page",
    "Step 1: Type Citizen ID → click Continue",
    "Step 2: Camera activates → capture face → wait for green verified badge",
    "Step 3: Click Sign In with Device Key → complete OS prompt → dashboard loads",
])
say_box(doc, [
    '"Our login flow has three independent layers of security — each verifying identity',
    "in a different way.",
    "",
    "Step one — the Citizen enters their ID. The system checks whether a device key has",
    "been registered. If not, login is blocked. This prevents any account that has not",
    "set up strong authentication from proceeding.",
    "",
    "Step two — Face Verification. The camera activates. The citizen captures their face.",
    "The image is sent to the backend, which retrieves the stored biometric template and",
    "forwards both to the Python biometric service for comparison.",
    "",
    "Step three — Device Key Authentication. The system sends a cryptographic challenge",
    "to the device. The authenticator signs it with the private key registered at setup.",
    "Because the private key never leaves the device, this is completely phishing-resistant",
    '— even capturing network traffic cannot compromise it."',
])
bts_box(doc, [
    "Face verification uses COSINE SIMILARITY between stored and current HOG feature vectors.",
    "",
    "Cosine similarity measures the angle between two vectors in 8,100-dimensional space.",
    "Two captures of the same face — even with slight lighting or angle differences — produce",
    "vectors pointing in nearly the same direction. A similarity score ≥ 0.75 is accepted.",
    "",
    "This replaces exact hash comparison (which always failed because floating-point",
    "biometric features are never bit-for-bit identical across captures).",
    "",
    "On successful 3-factor verification, the backend issues a JWT token containing",
    "citizenId, NIC number, and role='citizen'. Token expiry: 24 hours.",
    "All subsequent API calls must include this token in the Authorization header.",
])

# Scene 8
heading(doc, "Scene 8  —  Citizen Dashboard & DID", level=2)
show_box(doc, [
    "Show dashboard after login",
    "Point to: Identity Active status, DID string, stats row, notifications",
])
say_box(doc, [
    '"The dashboard confirms identity status — Identity Active — in green.',
    "",
    "The Decentralized Identifier is displayed here — the citizen's permanent blockchain",
    "address in the format did:fabric:{citizenId}. This DID is not controlled by any",
    'single authority. It lives on the distributed blockchain ledger."',
])

# Scene 9
heading(doc, "Scene 9  —  Consent Manager", level=2)
show_box(doc, [
    "Click Consent Manager in the sidebar",
    "Click + New Request → select an org → check 2-3 fields → Submit",
    "Show the consent request in the list with PENDING status",
])
say_box(doc, [
    '"This is one of the most important features from a privacy standpoint.',
    "",
    "Every time an organization wants to access a citizen's data, they must have the",
    "citizen's explicit consent — and the citizen chooses exactly which fields to share.",
    "",
    "For example: I can grant Hospital A access to my name and date of birth, but not",
    "my address or phone number. The citizen is always in control.",
    "",
    "When I submit this consent request, it goes to the organization portal for approval.",
    "Once both sides agree, the permission is written to the Consent Chaincode on the",
    'blockchain. Revoking consent removes that entry from the blockchain record."',
])
bts_box(doc, [
    "The effective data access for any organization is the INTERSECTION of two sets:",
    "",
    "  (1) Fields the ADMIN has configured the org is permitted to request",
    "  (2) Fields the CITIZEN has personally consented to share",
    "",
    "Even if the admin grants broad access, the citizen can further restrict it.",
    "Both constraints must be satisfied — the more restrictive always wins.",
    "",
    "Stored in the Consent Chaincode as: CONSENT_{citizenId}.Permissions[orgId] = [fields]",
])

# Scene 10
heading(doc, "Scene 10  —  Offline Identity Token", level=2)
show_box(doc, [
    "Click Offline Token in the sidebar",
    "Click Generate Token → show QR code and countdown timer",
    "Point to colour-coded timer and progress bar",
])
say_box(doc, [
    '"Not every verification scenario has internet access — a rural hospital, a border',
    "checkpoint, or an emergency situation might need to verify identity offline.",
    "",
    "This generates a time-limited offline token. The system produces a signed JWT and",
    "encodes it as a QR code. The token is valid for 24 hours.",
    "",
    "Any offline verifier can scan this QR code and cryptographically verify the citizen's",
    'identity without connecting to any server — the token is signed with the system key."',
])
bts_box(doc, [
    "The JWT offline token contains: citizenId, NIC number, DID, and expiry timestamp,",
    "all signed with the server's JWT_SECRET. Offline verifiers who hold the corresponding",
    "public key can validate the signature locally without any network call.",
    "",
    "The countdown timer (HH:MM:SS) and colour coding (green > 50%, orange 20–50%, red < 20%)",
    "are computed entirely in the browser from the token's expiry unix timestamp.",
])

# Scene 11
heading(doc, "Scene 11  —  Settings (Device Key Management)", level=2)
show_box(doc, [
    "Click Settings in the sidebar",
    "Show list of registered device keys with creation dates",
    "Show Add New Key and Remove buttons",
])
say_box(doc, [
    '"The Settings page allows citizens to manage their device keys.',
    "",
    "If you get a new device, register an additional key here. If a device is lost or",
    "stolen, remove that key — preventing anyone with the device from logging in.",
    "",
    "The system enforces a minimum of one key at all times. You cannot remove your last",
    'key without registering a replacement — so you can never accidentally lock yourself out."',
])

doc.add_page_break()

# ══════════════════════════════════════════════════════════════
#  PORTAL 3 — ORGANIZATION PORTAL
# ══════════════════════════════════════════════════════════════
tbl3 = doc.add_table(rows=1, cols=1)
tbl3.style = "Table Grid"
c3 = tbl3.cell(0, 0)
set_cell_bg(c3, "4C1D95")
p5 = c3.paragraphs[0]
p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p5, "PORTAL 3  —  ORGANIZATION PORTAL", bold=True, color=C_WHITE, size=16)
p6 = c3.add_paragraph()
p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p6, "http://localhost:3003", color=RGBColor(0xC4, 0xB5, 0xFD), size=11)
doc.add_paragraph()

# Scene 12
heading(doc, "Scene 12  —  Organization Login", level=2)
show_box(doc, [
    "Open http://localhost:3003 → log in with org credentials",
])
say_box(doc, [
    '"This portal is for Service Partner Organizations — hospitals, banks, universities,',
    "government departments — any institution with a legitimate need for citizen identity data.",
    "",
    "Organizations are registered and approved by the admin before they can access the system.",
    'Each organization has a defined set of data fields they are permitted to work with."',
])

# Scene 13
heading(doc, "Scene 13  —  Organization Dashboard", level=2)
show_box(doc, [
    "Show the org dashboard",
    "Point to: Enrolled Citizens count, Channel name, Blockchain Status",
])
say_box(doc, [
    '"The dashboard shows enrolled citizens, blockchain channel connection, and network status.',
    "",
    "Notice this organization is connected to identitychannel — the Hyperledger Fabric",
    "channel all participants share. All transactions go through this same channel,",
    'ensuring consistency and auditability across the entire network."',
])

# Scene 14
heading(doc, "Scene 14  —  Enrolling a Citizen", level=2)
show_box(doc, [
    "Click My Citizens → Add Citizen",
    "Step 1: Enter a Citizen ID → click Find Citizen → show lookup result",
    "Step 2: Camera activates → capture citizen's face → watch verification",
    "Show success: Citizen Added confirmation",
])
say_box(doc, [
    '"Before an organization can access a citizen\'s data, they must enroll the citizen.',
    "This face-verification step proves the person standing here is the same person",
    "whose identity was approved on the blockchain.",
    "",
    "Step one — the system looks up the citizen by ID, confirms they are approved, and",
    "retrieves their name and NIC so the representative can visually confirm the right person.",
    "",
    "Step two — the representative captures the citizen's face. This is sent to the backend,",
    "which retrieves the citizen's biometric template from their original registration",
    "and runs cosine similarity comparison. If the face matches, the citizen is added",
    'to this organization\'s registry. If not, enrollment is rejected."',
])
bts_box(doc, [
    "The enroll endpoint POST /api/orgrecords/enroll performs:",
    "  1. Database lookup for citizen record and biometric template",
    "  2. Face verification against the Python biometric service (cosine similarity)",
    "  3. On success: insert into OrgCitizenLink table (orgId → citizenId)",
    "  4. Log CITIZEN_ENROLLED audit event to the blockchain",
    "",
    "This two-party verification — identity on blockchain + physical face match — ensures",
    "an organization cannot fraudulently enroll a citizen who is not physically present.",
])

# Scene 15
heading(doc, "Scene 15  —  Adding Official Records", level=2)
show_box(doc, [
    "Click Add Record next to an enrolled citizen",
    "Select category: Medical / Financial / Educational / Employment / Government",
    "Enter a title and record data → click Sign & Anchor to Ledger",
    "Show success message",
])
say_box(doc, [
    '"Once enrolled, an organization can add official records to a citizen\'s identity.',
    "A hospital attaches a medical report. A university attaches a degree certificate.",
    "A government department attaches a security clearance.",
    "",
    "The organization selects a category, gives it a title, and enters the record data.",
    "",
    "When submitted, the record is cryptographically signed with the organization's",
    "credentials and anchored to the citizen's identity record on the blockchain.",
    "",
    "The citizen receives an instant notification. The organization cannot modify or",
    'delete the record after submission — the blockchain ensures permanence."',
])
bts_box(doc, [
    "The backend verifies the org is linked to this citizen via OrgCitizenLink.",
    "The record is stored in the OrganizationRecord table.",
    "An audit chaincode event RECORD_ADDED is logged: orgId, citizenId, timestamp.",
    "The citizen notification is inserted into the Notification table immediately.",
    "",
    "This creates an end-to-end traceable chain: org identity on blockchain →",
    "consent permission on blockchain → record anchored on blockchain →",
    "audit log on blockchain. Every step is independently verifiable.",
])

# Scene 16
heading(doc, "Scene 16  —  Consent Requests (Org Side)", level=2)
show_box(doc, [
    "Click Consent Requests in the org portal sidebar",
    "Show pending request from a citizen → approve it",
])
say_box(doc, [
    '"When a citizen initiates a consent request to share data with this organization,',
    "it appears here. The organization reviews which fields the citizen has offered",
    "to share and accepts or declines.",
    "",
    "Once accepted, the permission is stored on the Consent Chaincode. This means even",
    "if our own database were compromised, the consent record on the blockchain remains",
    'authoritative. Data access without a valid blockchain consent record is blocked."',
])

doc.add_page_break()

# ══════════════════════════════════════════════════════════════
#  CLOSING
# ══════════════════════════════════════════════════════════════
tbl4 = doc.add_table(rows=1, cols=1)
tbl4.style = "Table Grid"
c4 = tbl4.cell(0, 0)
set_cell_bg(c4, "0F172A")
p7 = c4.paragraphs[0]
p7.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p7, "CLOSING  —  Architecture Summary", bold=True, color=C_WHITE, size=16)
doc.add_paragraph()

say_box(doc, [
    '"Let me close by summarising what makes this system technically significant.',
    "",
    "Three-layer security for every authentication: identity, biometric, and cryptographic",
    "device proof. No single factor can be compromised to gain access.",
    "",
    "Blockchain immutability: Hyperledger Fabric with four custom chaincodes — Identity,",
    "Consent, Audit, and OrgPermission. Every identity creation, consent grant, data access",
    "is permanently recorded. No administrator can retroactively alter this history.",
    "",
    "Privacy by design: citizens explicitly consent to exactly which fields each organization",
    "can see. Effective permissions are the intersection of admin policy and citizen consent",
    "— the more restrictive of the two always wins.",
    "",
    "Offline capability: citizens prove identity without internet using cryptographically",
    "signed time-limited tokens.",
    "",
    "Decentralized identity: each citizen owns a DID — not tied to any single server or",
    "company. It lives on the distributed blockchain ledger.",
    "",
    "This system is designed to be deployable at national scale, with the security standards",
    'and privacy guarantees that citizens expect from a government-issued digital identity."',
])

doc.add_page_break()

# ══════════════════════════════════════════════════════════════
#  QUICK REFERENCE TABLES
# ══════════════════════════════════════════════════════════════
heading(doc, "Quick Reference", level=1, space_before=6)

heading(doc, "Portal URLs & Credentials", level=3)
simple_table(doc,
    headers=["Portal", "URL", "Credential"],
    rows=[
        ["Admin Portal",   "http://localhost:3000", "admin / Admin@2025"],
        ["Citizen Portal", "http://localhost:3002", "Register a new citizen"],
        ["Org Portal",     "http://localhost:3003", "Org ID + password"],
        ["Backend API",    "http://localhost:3001/health", "—"],
        ["Biometric Svc",  "http://localhost:5001/health", "—"],
    ],
    col_widths=[1.6, 2.4, 2.4]
)

heading(doc, "Key Technical Terms", level=3)
simple_table(doc,
    headers=["Term", "Plain English"],
    rows=[
        ["Hyperledger Fabric",  "Permissioned blockchain — only approved participants can join"],
        ["DID",                 "Decentralized Identifier — a blockchain-based identity address"],
        ["HOG Descriptor",      "8,100-float mathematical description of a face's shape (Histogram of Oriented Gradients)"],
        ["Cosine Similarity",   "Angle-based comparison of two feature vectors (threshold: 0.75)"],
        ["WebAuthn / FIDO2",    "Standard for device-bound passwordless authentication (passkeys)"],
        ["Chaincode",           "Smart contract on Hyperledger Fabric (written in Go)"],
        ["JWT",                 "JSON Web Token — a signed credential issued after login (24h expiry)"],
        ["Consensus",           "Agreement protocol ensuring all blockchain nodes have identical data"],
        ["Immutable",           "Cannot be changed or deleted after being written to the ledger"],
        ["Passkey",             "Private key stored on device, signed with biometric or PIN"],
        ["Cosine threshold 0.75", "Minimum similarity score to accept face as a match"],
        ["identitychannel",     "The Hyperledger Fabric channel shared by all network participants"],
    ],
    col_widths=[2.2, 4.2]
)

heading(doc, "Blockchain Chaincodes", level=3)
simple_table(doc,
    headers=["Chaincode", "Purpose", "Key Functions"],
    rows=[
        ["identity",      "Store citizen DIDs and identity records",   "CreateIdentity, GetIdentity, RevokeIdentity"],
        ["consent",       "Citizen-controlled data sharing permissions","GrantPermission, DeclinePermission, GetConsentedFields"],
        ["audit",         "Immutable event log for all actions",        "LogEvent, GetCitizenAuditLog"],
        ["orgpermission", "Organization registration and field policy", "RegisterOrganization, GetOrgPermittedFields, SuspendOrganization"],
    ],
    col_widths=[1.5, 2.5, 2.4]
)

# ── Save DOCX ─────────────────────────────────────────────────
doc.save(OUT_DOCX)
print(f"[OK] Word document saved: {OUT_DOCX}")

# ── Convert to PDF ────────────────────────────────────────────
try:
    from docx2pdf import convert
    convert(OUT_DOCX, OUT_PDF)
    print(f"[OK] PDF saved:          {OUT_PDF}")
except Exception as e:
    print(f"[!!] PDF conversion failed: {e}")
    print("     Open the .docx in Word and export to PDF manually.")

print("\nDone.")
