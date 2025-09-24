require('dotenv').config()
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const path = require('path')
const fs = require('fs')
const mime = require('mime-types')
const { exec } = require('child_process')

const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const PROJECT_ID = process.env.PROJECT_ID;

const init = async () => {
    console.log("Executing script.js")
    const outDirPath = path.join(__dirname, 'output')
    const p = exec(`cd ${outDirPath} && npm install && npm run build`)

    p.stdout.on('data', (data) => console.log(data.toString()))
    p.stderr.on('data', (data) => console.log('Error', data.toString()))

    p.on('close', async () => {
        console.log('Build complete')
        const distFolderPath = path.join(outDirPath, 'dist')

        const getAllFiles = (dir) =>
            fs.readdirSync(dir).flatMap(f => {
                const fullPath = path.join(dir, f)
                return fs.lstatSync(fullPath).isDirectory()
                    ? getAllFiles(fullPath)
                    : fullPath
            })

        const distFolderContents = getAllFiles(distFolderPath)

        for (const file of distFolderContents) {
            console.log(`Uploading ${file}`)
            const command = new PutObjectCommand({
                Bucket: 'deployhub-devesh',
                Key: `__outputs/${PROJECT_ID}/${path.relative(distFolderPath, file)}`,
                Body: fs.createReadStream(file),
                ContentType: mime.lookup(file) || 'application/octet-stream'
            })
            await s3Client.send(command)
            console.log(`Uploaded ${file}`)
        }

        console.log('Upload on S3 is done...')
    })
}

init()
