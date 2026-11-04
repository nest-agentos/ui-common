// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {SettingsBaseEditor, requestSettingsSave, captureForm, restoreForm} from '../src';

it('keeps failed edits recoverable and only unsubscribes after a successful close', async()=>{
    const unsubscribe=vi.fn(), save=vi.fn().mockRejectedValueOnce(new Error('Disk full')).mockResolvedValue(undefined);
    class Editor extends SettingsBaseEditor<{onChange:()=>()=>void}> {
        render(){this.container.innerHTML='<input name="title" value="Draft">';this.bindAutoSave(this.container,save);}
    }
    const root=document.createElement('div'), editor=new Editor(root,{onChange:()=>unsubscribe},{},{t:key=>key,escapeAttr:value=>value,entityIcon:''});
    await editor.init(root);requestSettingsSave(root);
    await expect(editor.destroy()).rejects.toThrow('settings.autosave.leaveFailed');
    expect(editor.isDirty()).toBe(true);expect(root.querySelector('input')!.value).toBe('Draft');expect(unsubscribe).not.toHaveBeenCalled();
    await editor.destroy();await editor.destroy();expect(unsubscribe).toHaveBeenCalledOnce();expect(root.childNodes).toHaveLength(0);
});
it('rejects a changed recovery form without partially restoring secrets or logging their values',()=>{
    const root=document.createElement('div');root.innerHTML='<input name="key" value="private-value">';
    const snapshot=captureForm(root);root.innerHTML='<input name="changed" value="keep">';
    const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
    try {expect(()=>restoreForm(root,snapshot)).toThrow('httpApp.recoveryFormChanged');
        expect(root.querySelector('input')!.value).toBe('keep');expect(JSON.stringify(log.mock.calls)).not.toContain('private-value');
    }finally{log.mockRestore();}
});
