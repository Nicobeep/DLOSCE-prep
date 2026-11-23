#!/usr/bin/env python3
"""DLOSCE Website Editor — launch with ``python site_editor.py``.

A local desktop editor (Tkinter is included with most Python installations).
- Edit all nine subject-note Markdown files.
- Add/edit single-answer, multiple-select and prescription tasks in questions.json.
- Add/edit authentic source-credited image cases.
- Edit website title and homepage introduction.
- Validate, rebuild, and preview the STATIC website with one click.

No cloud account or Python backend needed. Only ``Build website`` requires
requirements-editing.txt (beautifulsoup4 and markdown-it-py).

Command-line alternatives:
    python site_editor.py --check
    python site_editor.py --build
    python site_editor.py --serve        # local preview server
"""
from __future__ import annotations
import argparse
import copy
import http.server
import json
from pathlib import Path
import subprocess
import sys
import threading
import uuid
import webbrowser

ROOT = Path(__file__).resolve().parent
NOTE_DIR = ROOT  # Notes are stored as module .md files beside index.html
MODULES = [
    ('restorative', 'Restorative dentistry'),
    ('prosthodontics', 'Prosthodontics'),
    ('oral-pathology', 'Oral pathology, pain & TMD'),
    ('periodontics', 'Periodontics'),
    ('oral-surgery', 'Oral surgery'),
    ('endodontics', 'Endodontics'),
    ('orthodontics', 'Orthodontics'),
    ('medical-emergencies', 'Medical emergencies'),
    ('prescriptions', 'Prescriptions'),
]
NAMES = dict(MODULES)


def read_json(name, default=None):
    path=ROOT/name
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def save_json(name, data):
    path=ROOT/name
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')


def run_build(check=False):
    args=[sys.executable,str(ROOT/'build_content.py')]
    if check:args.append('--check')
    return subprocess.run(args,cwd=ROOT,text=True,capture_output=True)


def serve():
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    httpd=http.server.ThreadingHTTPServer(('127.0.0.1',8000),Handler)
    print('DLOSCE preview: http://127.0.0.1:8000/index.html')
    print('Press Ctrl+C to stop. Public hosting still uses static HTML (no permanent backend).')
    try:httpd.serve_forever()
    except KeyboardInterrupt:pass
    finally:httpd.server_close()


def launch_gui():
    import tkinter as tk
    from tkinter import ttk, messagebox
    from tkinter.scrolledtext import ScrolledText

    class Editor:
        def __init__(self,root):
            self.root=root;self.root.title('DLOSCE Website Editor')
            self.root.geometry('1100x800');self.root.minsize(800,560)
            self.question_data=read_json('questions.json',[])
            self.image_data=read_json('authentic-image-bank.json',[])
            self.settings=read_json('site-settings.json',{})
            self.server=None
            sty=ttk.Style()
            if 'clam' in sty.theme_names():sty.theme_use('clam')
            sty.configure('TButton',padding=(12,8));sty.configure('TNotebook.Tab',padding=(14,8))
            top=ttk.Frame(root,padding=13);top.pack(fill='x')
            ttk.Label(top,text='DLOSCE Content Editor',font=('Segoe UI',17,'bold')).pack(side='left',padx=(4,15))
            ttk.Button(top,text='Save current tab',command=self.save_active).pack(side='right',padx=4)
            ttk.Button(top,text='Build website',command=self.build).pack(side='right',padx=4)
            ttk.Button(top,text='Preview website',command=self.preview).pack(side='right',padx=4)
            ttk.Button(top,text='Validate',command=self.check).pack(side='right',padx=4)
            self.tabs=ttk.Notebook(root);self.tabs.pack(fill='both',expand=True,padx=14,pady=8)
            self.notes_tab=ttk.Frame(self.tabs);self.questions_tab=ttk.Frame(self.tabs);self.images_tab=ttk.Frame(self.tabs);self.settings_tab=ttk.Frame(self.tabs);self.help_tab=ttk.Frame(self.tabs)
            for frame,label in [(self.notes_tab,'Study notes'),(self.questions_tab,'Questions'),(self.images_tab,'Real images'),(self.settings_tab,'Website text'),(self.help_tab,'Help')]:self.tabs.add(frame,text=label)
            self.status=tk.StringVar(value='Ready. Edit content, save, then click Build website.')
            self.build_notes();self.build_questions();self.build_images();self.build_settings();self.build_help()
            ttk.Label(root,textvariable=self.status,anchor='w',padding=12).pack(side='bottom',fill='x')
            root.bind('<Control-s>',lambda e:self.save_active())
            root.bind('<Control-b>',lambda e:self.build())

        def info(self,message):self.status.set(message)
        def error(self,title,message):messagebox.showerror(title,message)
        def active(self):return self.tabs.index(self.tabs.select())
        def save_active(self):
            try:
                callbacks={0:self.save_note,1:self.save_question,2:self.save_image,3:self.save_settings}
                if self.active() in callbacks:callbacks[self.active()]()
                else:self.info('No changes to save in Help tab.')
            except Exception as e:self.error('Could not save',str(e))

        def build(self):
            try:
                # Save current edits first, then rebuild HTML/JS from Markdown and JSON.
                if self.active() in (0,1,2,3):
                    {0:self.save_note,1:self.save_question,2:self.save_image,3:self.save_settings}[self.active()]()
                res=run_build()
                if res.returncode:raise ValueError((res.stdout+'\n'+res.stderr).strip())
                self.info('Website rebuilt successfully. Preview or refresh the browser.')
                messagebox.showinfo('Website updated',res.stdout+'\nRefresh your browser to see changes.')
            except Exception as e:self.error('Build failed',str(e))

        def check(self):
            res=run_build(check=True)
            msg=(res.stdout+'\n'+res.stderr).strip()
            if res.returncode:self.error('Validation failed',msg)
            else:messagebox.showinfo('Validation passed',msg)

        def preview(self):
            if not self.server:
                class Handler(http.server.SimpleHTTPRequestHandler):
                    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
                    def log_message(self,*args):pass
                self.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
                threading.Thread(target=self.server.serve_forever,daemon=True).start()
                self.root.protocol('WM_DELETE_WINDOW',self.close)
            addr='http://127.0.0.1:'+str(self.server.server_port)+'/index.html'
            webbrowser.open(addr)
            self.info('Preview opened: '+addr)

        def close(self):
            if self.server:self.server.shutdown();self.server.server_close()
            self.root.destroy()

        def build_notes(self):
            tab=self.notes_tab
            line=ttk.Frame(tab,padding=(12,12));line.pack(fill='x')
            ttk.Label(line,text='Module:').pack(side='left',padx=(0,8))
            self.note_module=tk.StringVar(value=MODULES[0][0])
            ttk.Combobox(line,textvariable=self.note_module,values=[x[0] for x in MODULES],state='readonly',width=28).pack(side='left')
            ttk.Button(line,text='Load module',command=self.load_note).pack(side='left',padx=8)
            ttk.Label(tab,text='Markdown is editable: use ## for headings, **text** for bold, and - for lists. Changes do not appear online until you Build website.',padding=(14,2)).pack(anchor='w')
            self.note_text=ScrolledText(tab,wrap='word',font=('Consolas',11),undo=True)
            self.note_text.pack(fill='both',expand=True,padx=14,pady=10)
            self.load_note()

        def load_note(self):
            p=NOTE_DIR/(self.note_module.get()+'.md')
            self.note_text.delete('1.0','end');self.note_text.insert('1.0',p.read_text(encoding='utf-8'))
            self.info('Loaded '+p.name)

        def save_note(self):
            p=NOTE_DIR/(self.note_module.get()+'.md')
            text=self.note_text.get('1.0','end-1c')
            if len(text.strip())<30:raise ValueError('Module notes look empty; refusing to overwrite the file.')
            p.write_text(text.rstrip()+'\n',encoding='utf-8')
            self.info('Saved '+p.name+'. Click Build website to update the HTML page.')

        def build_questions(self):
            tab=self.questions_tab
            row=ttk.Frame(tab,padding=12);row.pack(fill='x')
            ttk.Label(row,text='Question ID:').pack(side='left')
            self.q_id=tk.StringVar()
            self.q_select=ttk.Combobox(row,textvariable=self.q_id,values=[q['id'] for q in self.question_data],width=41)
            self.q_select.pack(side='left',padx=7)
            ttk.Button(row,text='Load selected',command=self.load_question).pack(side='left',padx=3)
            ttk.Button(row,text='New question',command=self.new_question).pack(side='left',padx=3)
            self.q_module=tk.StringVar(value=MODULES[0][0])
            self.q_type=tk.StringVar(value='single')
            self.q_correct=tk.StringVar(value='1')
            self.q_image=tk.StringVar(value='')
            form=ttk.Frame(tab,padding=(14,0));form.pack(fill='both',expand=True)
            line=ttk.Frame(form);line.pack(fill='x')
            ttk.Label(line,text='Subject:').pack(side='left')
            ttk.Combobox(line,textvariable=self.q_module,values=[x[0] for x in MODULES],state='readonly',width=21).pack(side='left',padx=(6,8))
            ttk.Label(line,text='Format:').pack(side='left')
            ttk.Combobox(line,textvariable=self.q_type,values=['single','multi','prescription'],state='readonly',width=15).pack(side='left',padx=6)
            ttk.Label(line,text='Correct choices (1,2,...):').pack(side='left')
            ttk.Entry(line,textvariable=self.q_correct,width=13).pack(side='left',padx=6)
            ttk.Label(line,text='Image ID:').pack(side='left')
            ttk.Entry(line,textvariable=self.q_image,width=13).pack(side='left')
            ttk.Label(form,text='Clinical case / question stem',padding=(0,8)).pack(anchor='w')
            self.q_stem=ScrolledText(form,height=5,wrap='word');self.q_stem.pack(fill='both',expand=True)
            ttk.Label(form,text='Question prompt (optional: separate from the Patient Box)',padding=(0,7)).pack(anchor='w')
            self.q_prompt=ScrolledText(form,height=3,wrap='word');self.q_prompt.pack(fill='both',expand=True)
            ttk.Label(form,text='Patient Box JSON: demographics, complaint, history, current_findings (only documented facts)',padding=(0,7)).pack(anchor='w')
            self.q_patientbox=ScrolledText(form,height=6,wrap='word',font=('Consolas',10));self.q_patientbox.pack(fill='both',expand=True)
            ttk.Label(form,text='Answer choices, one per line (single/multi only)',padding=(0,7)).pack(anchor='w')
            self.q_choices=ScrolledText(form,height=6,wrap='word');self.q_choices.pack(fill='both',expand=True)
            ttk.Label(form,text='Prescription fields JSON (prescription only; list of label, choices and zero-based correct)',padding=(0,7)).pack(anchor='w')
            self.q_fields=ScrolledText(form,height=6,wrap='word',font=('Consolas',10));self.q_fields.pack(fill='both',expand=True)
            ttk.Label(form,text='Explanation, including clinical reasoning and contraindications',padding=(0,7)).pack(anchor='w')
            self.q_expl=ScrolledText(form,height=5,wrap='word');self.q_expl.pack(fill='both',expand=True)
            ttk.Label(form,text='All questions must be original. Never copy protected ADA/ADEX questions or images.',foreground='#637284').pack(anchor='w')
            if self.question_data:
                self.q_id.set(self.question_data[0]['id']);self.load_question()

        def new_question(self):
            self.q_id.set('original-'+uuid.uuid4().hex[:10])
            self.q_module.set(MODULES[0][0]);self.q_type.set('single')
            self.q_correct.set('1');self.q_image.set('')
            for box in (self.q_stem,self.q_prompt,self.q_patientbox,self.q_choices,self.q_fields,self.q_expl):box.delete('1.0','end')
            self.info('New case. Select single, multi, or prescription format; save, then build.')

        def load_question(self):
            q=next((x for x in self.question_data if x['id']==self.q_id.get()),None)
            if q is None:raise ValueError('Question ID not found. Select or create a case.')
            typ=q.get('type','single')
            self.q_type.set(typ);self.q_module.set(q['module'])
            correct=q.get('correct',[])
            if typ=='prescription':self.q_correct.set('')
            elif typ=='multi':self.q_correct.set(', '.join(str(i+1) for i in correct))
            else:self.q_correct.set(str(correct+1))
            self.q_image.set(q.get('image_id',''))
            values=((self.q_stem,q['stem']),
                    (self.q_prompt,q.get('question_prompt','')),
                    (self.q_patientbox,json.dumps(q.get('patient_box',{}),indent=2,ensure_ascii=False)),
                    (self.q_choices,'\n'.join(q.get('choices',[]))),
                    (self.q_fields,json.dumps(q.get('fields',[]),indent=2,ensure_ascii=False) if typ=='prescription' else ''),
                    (self.q_expl,q['explanation']))
            for box,value in values:
                box.delete('1.0','end');box.insert('1.0',value)
            self.info('Loaded '+q['id']+' ('+typ+').')

        def save_question(self):
            qid=self.q_id.get().strip()
            if not qid:raise ValueError('Select or create a case first.')
            stem=self.q_stem.get('1.0','end-1c').strip()
            explanation=self.q_expl.get('1.0','end-1c').strip()
            if not stem or not explanation:raise ValueError('A clinical stem and explanation are required.')
            typ=self.q_type.get()
            if typ not in ('single','multi','prescription'):raise ValueError('Unknown question format.')
            imageid=self.q_image.get().strip()
            if imageid and not any(x['id']==imageid for x in self.image_data):raise ValueError('Image ID does not exist. Add the source under Real images first.')
            old=next((x for x in self.question_data if x['id']==qid),None)
            if old is None:
                old={'id':qid,'base':qid};self.question_data.append(old)
            old.update({'module':self.q_module.get(),'type':typ,'stem':stem,'explanation':explanation,'source_type':'original-modelled-format'})
            prompt=self.q_prompt.get('1.0','end-1c').strip()
            if prompt:old['question_prompt']=prompt
            else:old.pop('question_prompt',None)
            patient_text=self.q_patientbox.get('1.0','end-1c').strip()
            if patient_text and patient_text!='{}':
                try:patient=json.loads(patient_text)
                except json.JSONDecodeError as error:raise ValueError('Patient Box must contain valid JSON: '+str(error))
                required=('demographics','complaint','history','current_findings')
                if not isinstance(patient,dict) or any(not isinstance(patient.get(key),str) or not patient[key].strip() for key in required):
                    raise ValueError('Patient Box needs four nonempty text fields: demographics, complaint, history, current_findings.')
                old['patient_box']=patient
            else:old.pop('patient_box',None)
            if typ=='prescription':
                try:fields=json.loads(self.q_fields.get('1.0','end-1c'))
                except json.JSONDecodeError as error:raise ValueError('Prescription fields must contain valid JSON: '+str(error))
                if not isinstance(fields,list) or len(fields)<4:raise ValueError('Prescription task requires four or more fields.')
                for field in fields:
                    opts=field.get('choices',[])
                    if not isinstance(field.get('label'),str) or not isinstance(opts,list) or len(opts)<2:raise ValueError('Each prescription field needs a label and at least two choices.')
                    if type(field.get('correct')) is not int or not 0<=field['correct']<len(opts):raise ValueError('Prescription correct indexes must be zero-based and valid.')
                old['fields']=fields
                old.pop('choices',None);old.pop('correct',None);old.pop('neutral',None)
            else:
                choices=[c.strip() for c in self.q_choices.get('1.0','end-1c').splitlines() if c.strip()]
                if len(choices)<2 or len(set(choices))!=len(choices):raise ValueError('Enter at least two unique answer choices.')
                try:keys=[int(v.strip())-1 for v in self.q_correct.get().split(',') if v.strip()]
                except ValueError:raise ValueError('Correct choices must be numbers separated by commas.')
                if not keys or any(k<0 or k>=len(choices) for k in keys) or len(set(keys))!=len(keys):raise ValueError('Correct choice indexes are invalid.')
                if typ=='single' and len(keys)!=1:raise ValueError('A single-answer item must have exactly one correct choice.')
                old.update({'choices':choices,'correct':keys[0] if typ=='single' else keys})
                old.pop('fields',None);old.pop('neutral',None)
            if imageid:old['image_id']=imageid
            else:old.pop('image_id',None)
            save_json('questions.json',self.question_data)
            self.q_select['values']=[x['id'] for x in self.question_data]
            self.info('Saved '+qid+'. Click Build website to publish updates.')

        def build_images(self):
            tab=self.images_tab
            line=ttk.Frame(tab,padding=12);line.pack(fill='x')
            ttk.Label(line,text='Clinical image ID:').pack(side='left')
            self.img_id=tk.StringVar(value=self.image_data[0]['id'] if self.image_data else '')
            self.img_select=ttk.Combobox(line,textvariable=self.img_id,values=[x['id'] for x in self.image_data],width=34)
            self.img_select.pack(side='left',padx=8)
            ttk.Button(line,text='Load selected',command=self.load_image).pack(side='left',padx=3)
            ttk.Button(line,text='New image case',command=self.new_image).pack(side='left',padx=3)
            wrap=ttk.Frame(tab,padding=(14,0));wrap.pack(fill='both',expand=True)
            self.image_fields={}
            for field,label in [('module','Subject slug'),('title','Clinical image title'),('image','Direct HTTPS image URL'),('source','Original source page URL'),('author','Photographer / author'),('license','License e.g. CC BY-SA 4.0'),('license_url','License page URL')]:
                r=ttk.Frame(wrap);r.pack(fill='x',pady=3)
                ttk.Label(r,text=label,width=27).pack(side='left')
                v=tk.StringVar();self.image_fields[field]=v
                if field=='module':ttk.Combobox(r,textvariable=v,values=[x[0] for x in MODULES],state='readonly',width=45).pack(side='left',fill='x',expand=True)
                else:ttk.Entry(r,textvariable=v,width=80).pack(side='left',fill='x',expand=True)
            ttk.Label(wrap,text='Interpretation prompt:').pack(anchor='w',pady=(8,0))
            self.img_prompt=ScrolledText(wrap,height=5,wrap='word');self.img_prompt.pack(fill='both',expand=True)
            ttk.Label(wrap,text='Explanation:').pack(anchor='w',pady=(8,0))
            self.img_answer=ScrolledText(wrap,height=5,wrap='word');self.img_answer.pack(fill='both',expand=True,pady=(0,6))
            ttk.Label(wrap,text='Only add authentic clinical images with documented permission to reuse. Do not upload AI-generated or restricted images.',foreground='#735134').pack(anchor='w')
            if self.image_data:self.load_image()

        def new_image(self):
            self.img_id.set('real-'+uuid.uuid4().hex[:8])
            for field,v in self.image_fields.items():v.set('restorative' if field=='module' else '')
            for box in (self.img_prompt,self.img_answer):box.delete('1.0','end')
            self.info('New real-image case: provide source, author and verified licensing.')

        def load_image(self):
            d=next((x for x in self.image_data if x['id']==self.img_id.get()),None)
            if d is None:raise ValueError('Image ID not found. Create a new image case first.')
            for name,var in self.image_fields.items():var.set(d.get(name,''))
            for box,value in ((self.img_prompt,d.get('prompt','')),(self.img_answer,d.get('answer',''))):
                box.delete('1.0','end');box.insert('1.0',value)
            self.info('Loaded image case '+d['id'])

        def save_image(self):
            imageid=self.img_id.get().strip()
            if not imageid:raise ValueError('Enter a unique image ID.')
            vals={name:v.get().strip() for name,v in self.image_fields.items()}
            vals['prompt']=self.img_prompt.get('1.0','end-1c').strip()
            vals['answer']=self.img_answer.get('1.0','end-1c').strip()
            for name in ('module','title','image','source','author','license','license_url','prompt','answer'):
                if not vals[name]:raise ValueError('Required field missing: '+name)
            for name in ('image','source','license_url'):
                if not vals[name].startswith('https://'):raise ValueError(name+' must begin with https://')
            old=next((x for x in self.image_data if x['id']==imageid),None)
            if old is None:old={'id':imageid};self.image_data.append(old)
            old.update(vals)
            save_json('authentic-image-bank.json',self.image_data)
            self.img_select['values']=[x['id'] for x in self.image_data]
            self.info('Saved image case '+imageid+'. Build website to publish it.')

        def build_settings(self):
            tab=self.settings_tab
            self.setting_vars={}
            labels=[('site_title','Website title'),('site_subtitle','Short site tagline'),('home_heading','Homepage headline'),('home_description','Homepage introduction')]
            for key,label in labels:
                frame=ttk.Frame(tab,padding=(16,12));frame.pack(fill='x')
                ttk.Label(frame,text=label,width=23).pack(side='left')
                var=tk.StringVar(value=self.settings.get(key,''));self.setting_vars[key]=var
                ttk.Entry(frame,textvariable=var,width=85).pack(side='left',fill='x',expand=True)
            ttk.Label(tab,text='These fields control the shared site header and the first homepage panel. Blueprint percentages are kept in code because they must match official exam specifications.',wraplength=760,padding=16).pack(anchor='w')

        def save_settings(self):
            for key,var in self.setting_vars.items():
                val=var.get().strip()
                if not val:raise ValueError(key+' cannot be empty.')
                self.settings[key]=val
            save_json('site-settings.json',self.settings)
            self.info('Website copy saved. Click Build website to update all page headers.')

        def build_help(self):
            helptext='''HOW TO EDIT THE WEBSITE\n\n1. Choose Study notes, Questions, Real images, or Website text.\n2. Edit the information in the selected tab.\n3. Click “Save current tab” or press Ctrl+S.\n4. Click “Build website” (Ctrl+B). The builder updates the HTML/JavaScript.\n5. Click “Preview website” to view it locally in your browser.\n6. Upload the updated website files to GitHub Pages/Netlify to publish them.\n\nIMPORTANT\n• Notes are stored as <module>.md files in the repository root.\n• Questions live in questions.json — single, multi and prescription formats are supported.\n• Authentic image cases live in authentic-image-bank.json with source/license.\n• Site title and intro live in site-settings.json.\n• The official subject weights should only change when verified against a new JCNDE/ADEX blueprint.\n• Practice scores are NOT official DLOSCE pass-rate predictors.\n• The app runs on your computer. You do NOT need a permanent Python backend.\n• The preview server listens only on 127.0.0.1, not on the public internet.\n\nIf Build fails due to missing libraries, open a terminal in the website folder and run:\n  python -m pip install -r requirements-editing.txt\n\nTerminal shortcuts:\n  python site_editor.py --check\n  python site_editor.py --build\n  python site_editor.py --serve\n'''
            box=ScrolledText(self.help_tab,wrap='word',font=('Segoe UI',11),padx=15,pady=15)
            box.pack(fill='both',expand=True,padx=12,pady=12);box.insert('1.0',helptext);box.configure(state='disabled')

    try:
        root=tk.Tk()
    except tk.TclError as e:
        print('Graphical desktop unavailable:',e,file=sys.stderr)
        print('You can still run: python site_editor.py --build',file=sys.stderr)
        return 1
    Editor(root)
    root.mainloop()
    return 0


def main():
    parser=argparse.ArgumentParser(description='Edit and rebuild DLOSCE static study website')
    parser.add_argument('--build',action='store_true',help='regenerate website from Markdown and JSON')
    parser.add_argument('--check',action='store_true',help='validate content only')
    parser.add_argument('--serve',action='store_true',help='start local preview at http://127.0.0.1:8000/')
    args=parser.parse_args()
    if args.build or args.check:
        result=run_build(check=args.check)
        print(result.stdout,end='')
        if result.stderr:print(result.stderr,file=sys.stderr,end='')
        return result.returncode
    if args.serve:serve();return 0
    return launch_gui()

if __name__=='__main__':sys.exit(main())
