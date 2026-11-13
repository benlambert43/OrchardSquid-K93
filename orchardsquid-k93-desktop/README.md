Connecting to the iPad:

The app's Onboarding page walks through these steps and checks each one against the iPad. The page is in the sidebar until every step is done, and linked from the Settings page after that. The steps start from User Default: the iPad reset to factory settings, jailbroken with Carbon, with the iocaste untether and OpenSSH installed from Cydia. A reset undoes steps 2 and 3, so they are repeated after every reset.

1. Create this computer's key, once:

```
ssh-keygen -t ed25519 -N "" -C "OrchardSquid-K93" -f ~/.ssh/orchardsquid-k93
```

2. Add the key to the iPad. In the app, open the Shell page, which asks for the iPad's root password, and run the command that the Onboarding page shows under "Key added to the iPad". The password is not kept in this repository.

3. Change the passwords of `root` and `mobile` from the factory default, on the Shell page:

```
passwd root
passwd mobile
```

Without the key, the Shell page asks for the password each time, the Dashboard fills only its iPad and Status panels, and the Dependencies page stays empty.

From a terminal instead of the app:

~/.ssh/config needs to allow a less secure HostKeyAlgorithm supported by the processor:

```
   Host Bens-iPad
   HostName 192.168.68.115
   User root
   HostKeyAlgorithms +ssh-rsa
```

A reset gives the iPad a new host key, and ssh refuses to connect while `~/.ssh/known_hosts` still has the old one. Remove it first:

```
ssh-keygen -R 192.168.68.115
```

You can then add the key and ssh into the iPad. Both ask for the iPad's root password until the key is added:

```
ssh-copy-id -i ~/.ssh/orchardsquid-k93.pub Bens-iPad
ssh Bens-iPad
```

On the Settings page, Export backup saves the key and these settings as a zip file, and Restore backup sets another computer up from that file instead of the password. By hand, the same restore is:

```
mkdir -p ~/.ssh && chmod 700 ~/.ssh
(umask 077 && unzip -p backup.zip key.json | jq -j .privateKey > ~/.ssh/orchardsquid-k93)
unzip -p backup.zip key.json | jq -j .publicKey > ~/.ssh/orchardsquid-k93.pub
unzip -p backup.zip known-hosts.json | jq -r '.entries[] | "\(.hosts) \(.type) \(.key)"' >> ~/.ssh/known_hosts
unzip -p backup.zip ssh-config.json | jq -r '.hosts[] | "Host \(.host)", (.options[] | "    \(.name) \(.value)"), ""' >> ~/.ssh/config
```

The zip file holds the private key, so keep it as safe as the key itself.
