# Event Manager Backend

##Before push new commit 

- On Strapi UI go to PLUGINS -> Documentation tab 
- Click Regenerate button 
- Navigate to file - `app/extensions/documentation/documentation/1.0.0/full_documentation.json`
- Copy content and paste it to Swagger editor online tool - https://editor.swagger.io/

#####You will see error about declared path parameter "id"  
- Jump to error line and add parameter part of code
```yaml
      parameters:
        - in: path
          name: id
          required: true
          schema:
           type: string
```
between rows
```yaml
post:
  deprecated: false
```

Result will looks like: 
 ```yaml
    post:
      parameters:
       - in: path
         name: id
         required: true
         schema:
          type: string
      deprecated: false
```
- Find row `- name: '='` and replace to  `- name: _e`
- Generate client code 
  - Click "Generate Client" button and choose "typescript-axios" 

