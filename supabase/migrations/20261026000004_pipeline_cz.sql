-- SYB CRM: the Czech pipeline, exactly as in the Requirements Brief.
-- This is reference data, so it lives in a migration (production gets it too).
-- Admin can edit all of it later in Settings.

do $$
declare
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid; s6 uuid; s7 uuid; s8 uuid;
  exam_q uuid;
begin
  insert into public.stages (country, name, position) values ('CZ', 'Lead / Counselling', 1) returning id into s1;
  insert into public.stages (country, name, position) values ('CZ', 'University Selection', 2) returning id into s2;
  insert into public.stages (country, name, position) values ('CZ', 'Apostille', 3) returning id into s3;
  insert into public.stages (country, name, position) values ('CZ', 'University Application', 4) returning id into s4;
  insert into public.stages (country, name, position) values ('CZ', 'Pre-enrollment', 5) returning id into s5;
  insert into public.stages (country, name, position) values ('CZ', 'Nostrification', 6) returning id into s6;
  insert into public.stages (country, name, position) values ('CZ', 'Offer Letter', 7) returning id into s7;
  insert into public.stages (country, name, position) values ('CZ', 'Visa', 8) returning id into s8;

  -- Stage 1: Lead / Counselling
  insert into public.stage_steps (stage_id, label, kind, position, key) values
    (s1, 'Enquiry received', 'tick', 1, 'enquiry_received'),
    (s1, 'Counselling done', 'tick', 2, null),
    (s1, 'Course, budget and intake discussed', 'tick', 3, null);

  -- Stage 2: University Selection
  insert into public.stage_steps (stage_id, label, kind, position, key) values
    (s2, 'Shortlist shared', 'tick', 1, 'shortlist_shared'),
    (s2, 'Student''s final choice confirmed', 'tick', 2, 'final_choice');

  -- Stage 3: Apostille
  insert into public.stage_steps (stage_id, label, kind, position) values
    (s3, 'Documents sent', 'tick', 1),
    (s3, 'Process done', 'tick', 2),
    (s3, 'Documents reviewed', 'tick', 3),
    (s3, 'Copy of apostilled documents received by mail', 'tick', 4);

  -- Stage 4: University Application (exam steps only show when the answer is yes)
  insert into public.stage_steps (stage_id, label, kind, position) values
    (s4, 'Application submitted', 'tick', 1);
  insert into public.stage_steps (stage_id, label, kind, position, key) values
    (s4, 'Interview or entrance exam required?', 'yes_no', 2, 'exam_required')
    returning id into exam_q;
  insert into public.stage_steps (stage_id, label, kind, position, show_if_step_id, show_if_value, key) values
    (s4, 'Entrance exam date', 'date', 3, exam_q, 'yes', 'exam_date'),
    (s4, 'Entrance exam preparation', 'tick', 4, exam_q, 'yes', null);
  insert into public.stage_steps (stage_id, label, kind, position, show_if_step_id, show_if_value, pass_label, fail_label, key) values
    (s4, 'Exam result', 'pass_fail', 5, exam_q, 'yes', 'Passed', 'Failed', 'exam_result');

  -- Stage 5: Pre-enrollment
  insert into public.stage_steps (stage_id, label, kind, position) values
    (s5, 'University confirmation mail received', 'tick', 1),
    (s5, 'Payment reviewed', 'tick', 2),
    (s5, 'Pending documents reminder sent', 'tick', 3);

  -- Stage 6: Nostrification
  insert into public.stage_steps (stage_id, label, kind, position) values
    (s6, 'Documents notarized', 'tick', 1),
    (s6, 'Nostrification form filled', 'tick', 2),
    (s6, 'Documents couriered to the Czech Republic', 'tick', 3),
    (s6, 'Nostrification payment done', 'tick', 4),
    (s6, 'Confirmation received', 'tick', 5);

  -- Stage 7: Offer Letter
  insert into public.stage_steps (stage_id, label, kind, position) values
    (s7, 'University fee paid', 'tick', 1),
    (s7, 'Nostrification submitted', 'tick', 2),
    (s7, 'Offer letter and accommodation letter requested by mail', 'tick', 3),
    (s7, 'Offer letter and accommodation letter received by mail', 'tick', 4),
    (s7, 'Original offer letter sent by post', 'tick', 5),
    (s7, 'Courier service received (for visa documents)', 'tick', 6);

  -- Stage 8: Visa
  insert into public.stage_steps (stage_id, label, kind, position) values
    (s8, 'PCC application moved', 'tick', 1);
  insert into public.stage_steps (stage_id, label, kind, position, key) values
    (s8, 'Visa date registration', 'date', 2, 'visa_date');
  insert into public.stage_steps (stage_id, label, kind, position) values
    (s8, 'Visa interview preparation', 'tick', 3),
    (s8, 'Visa documents ready', 'tick', 4),
    (s8, 'Interview done', 'tick', 5);
  insert into public.stage_steps (stage_id, label, kind, position, pass_label, fail_label, key) values
    (s8, 'Result', 'pass_fail', 6, 'Approved', 'Rejected', 'visa_result');
end
$$;

insert into public.document_types (name, required, position) values
  ('Passport', true, 1),
  ('10th certificate', true, 2),
  ('12th certificate', true, 3),
  ('Degree certificate', false, 4),
  ('Transcripts', true, 5),
  ('PCC', true, 6),
  ('Photos', true, 7),
  ('Bank statement', true, 8);

insert into public.message_templates (name, body, position) values
  ('Document reminder',
   'Hi {name}, this is {counsellor} from See You Abroad. A quick reminder to share your pending documents in your Drive folder: {drive_link}. Thank you!', 1),
  ('Exam date',
   'Hi {name}, your entrance exam for {university} is on {exam_date}. We''ll help you prepare. - {counsellor}, See You Abroad', 2),
  ('Payment reminder',
   'Hi {name}, a reminder that your payment is pending. Please let us know once it''s done. - {counsellor}, See You Abroad', 3),
  ('Visa date',
   'Hi {name}, your visa appointment is on {visa_date}. Please keep all visa documents ready. - {counsellor}, See You Abroad', 4);
